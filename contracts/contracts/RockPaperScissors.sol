// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RockPaperScissors
 * @notice Single transaction settlement contract for two-player wagers. The first
 *         player to submit a move locks in the stake, the second resolves the game in
 *         the same transaction, and the winner receives the pot minus protocol fees.
 */
contract RockPaperScissors is ReentrancyGuard, Ownable {
    enum Move {
        None,
        Rock,
        Paper,
        Scissors
    }

    enum Status {
        None,
        WaitingForOpponent,
        Ready,
        Finished,
        Cancelled,
        Timeout
    }

    struct Game {
        address payable player1;
        address payable player2;
        uint96 betAmount;
        Move player1Move;
        Move player2Move;
        Status status;
        uint40 createdAt;
        uint40 expiresAt;
    }

    mapping(bytes32 => Game) private games;
    mapping(bytes32 => bool) private finalizedGames;

    uint256 public constant FEE_BPS = 500; // 5%
    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 public immutable minBet;
    uint256 public immutable maxBet;
    uint40 public defaultTimeout;
    uint256 public feePool;

    event GameOpened(bytes32 indexed gameId, address indexed initiator, uint256 stake);
    event MoveSubmitted(bytes32 indexed gameId, address indexed player, Move move);
    event GameSettled(
        bytes32 indexed gameId,
        address indexed winner,
        Move player1Move,
        Move player2Move,
        uint256 payout,
        uint256 feeAdded
    );
    event GameDraw(bytes32 indexed gameId, Move move);
    event GameCancelled(bytes32 indexed gameId);
    event GameTimedOut(bytes32 indexed gameId);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event TimeoutUpdated(uint40 newTimeout);

    error InvalidBet();
    error InvalidMove();
    error GameAlreadyClosed();
    error StakeMismatch();
    error NotParticipant();
    error CannotPlayTwice();
    error GameNotActive();
    error TooSoon();
    error NothingToWithdraw();

    constructor(uint40 timeoutSeconds, uint256 minAllowedBet, uint256 maxAllowedBet) Ownable(msg.sender) {
        require(timeoutSeconds >= 60, "timeout too low");
        require(minAllowedBet > 0 && maxAllowedBet >= minAllowedBet, "bad bet range");
        defaultTimeout = timeoutSeconds;
        minBet = minAllowedBet;
        maxBet = maxAllowedBet;
    }

    function submitMove(bytes32 gameId, Move move) external payable nonReentrant {
        if (move == Move.None) {
            revert InvalidMove();
        }
        if (finalizedGames[gameId]) {
            revert GameAlreadyClosed();
        }

        Game storage game = games[gameId];

        if (game.status == Status.None) {
            _openGame(game, gameId, move);
            return;
        }

        if (game.status != Status.WaitingForOpponent) {
            revert GameNotActive();
        }

        if (block.timestamp > game.expiresAt) {
            revert GameNotActive();
        }

        if (msg.sender == game.player1) {
            revert CannotPlayTwice();
        }

        if (msg.value != game.betAmount) {
            revert StakeMismatch();
        }

        game.player2 = payable(msg.sender);
        game.player2Move = move;
        game.status = Status.Ready;
        emit MoveSubmitted(gameId, msg.sender, move);

        _settle(gameId);
    }

    function cancel(bytes32 gameId) external nonReentrant {
        Game storage game = games[gameId];
        if (game.status != Status.WaitingForOpponent) {
            revert GameNotActive();
        }
        if (msg.sender != game.player1) {
            revert NotParticipant();
        }

        uint256 refund = game.betAmount;
        finalizedGames[gameId] = true;
        delete games[gameId];
        _payout(game.player1, refund);
        emit GameCancelled(gameId);
    }

    function claimTimeout(bytes32 gameId) external nonReentrant {
        Game storage game = games[gameId];
        if (game.status != Status.WaitingForOpponent) {
            revert GameNotActive();
        }
        if (block.timestamp < game.expiresAt) {
            revert TooSoon();
        }
        if (msg.sender != game.player1 && msg.sender != owner()) {
            revert NotParticipant();
        }

        uint256 refund = game.betAmount;
        finalizedGames[gameId] = true;
        delete games[gameId];
        _payout(game.player1, refund);
        emit GameTimedOut(gameId);
    }

    function withdrawFees(address payable recipient, uint256 amount) external onlyOwner {
        if (amount == 0 || amount > feePool) {
            revert NothingToWithdraw();
        }
        feePool -= amount;
        _payout(recipient, amount);
        emit FeesWithdrawn(recipient, amount);
    }

    function setDefaultTimeout(uint40 newTimeout) external onlyOwner {
        require(newTimeout >= 60, "min timeout 60s");
        defaultTimeout = newTimeout;
        emit TimeoutUpdated(newTimeout);
    }

    function getGame(bytes32 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    function _openGame(Game storage game, bytes32 gameId, Move move) private {
        if (msg.value < minBet || msg.value > maxBet) {
            revert InvalidBet();
        }

        game.player1 = payable(msg.sender);
        game.betAmount = uint96(msg.value);
        game.player1Move = move;
        game.status = Status.WaitingForOpponent;
        game.createdAt = uint40(block.timestamp);
        game.expiresAt = uint40(block.timestamp + defaultTimeout);

        emit GameOpened(gameId, msg.sender, msg.value);
        emit MoveSubmitted(gameId, msg.sender, move);
    }

    function _settle(bytes32 gameId) private {
        Game storage game = games[gameId];
        uint8 winnerIndex = _winner(game.player1Move, game.player2Move);

        uint256 feeContribution;
        uint256 payoutAmount;

        if (winnerIndex == 0) {
            _payout(game.player1, game.betAmount);
            _payout(game.player2, game.betAmount);
            emit GameDraw(gameId, game.player1Move);
        } else {
            address payable winner = winnerIndex == 1 ? game.player1 : game.player2;
            uint256 feePerPlayer = (uint256(game.betAmount) * FEE_BPS) / BPS_DENOMINATOR;
            feeContribution = feePerPlayer * 2;
            payoutAmount = uint256(game.betAmount) * 2 - feeContribution;
            feePool += feeContribution;
            _payout(winner, payoutAmount);
            emit GameSettled(gameId, winner, game.player1Move, game.player2Move, payoutAmount, feeContribution);
        }

        finalizedGames[gameId] = true;
        delete games[gameId];
    }

    function _winner(Move player1Move, Move player2Move) private pure returns (uint8) {
        if (player1Move == player2Move) {
            return 0;
        }

        if (
            (player1Move == Move.Rock && player2Move == Move.Scissors) ||
            (player1Move == Move.Scissors && player2Move == Move.Paper) ||
            (player1Move == Move.Paper && player2Move == Move.Rock)
        ) {
            return 1;
        }

        return 2;
    }

    function _payout(address payable to, uint256 amount) private {
        (bool success, ) = to.call{value: amount}("");
        require(success, "transfer failed");
    }
}

