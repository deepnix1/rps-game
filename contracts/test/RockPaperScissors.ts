import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("RockPaperScissors", () => {
  const timeout = 300;
  const minBet = ethers.parseEther("0.01");
  const maxBet = ethers.parseEther("10");

  async function deploy() {
    const [owner, player1, player2, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("RockPaperScissors");
    const contract = await factory.deploy(timeout, minBet, maxBet);
    await contract.waitForDeployment();
    return { contract, owner, player1, player2, other };
  }

  it("settles a winner and collects fees", async () => {
    const { contract, player1, player2 } = await deploy();
    const stake = ethers.parseEther("1");
    const gameId = ethers.id("win-game");

    await contract.connect(player1).submitMove(gameId, 1, { value: stake });
    const tx = () => contract.connect(player2).submitMove(gameId, 2, { value: stake });

    const totalFee = (stake * 5n) / 100n * 2n;
    const expectedNetGain = (stake * 2n - totalFee) - stake;

    await expect(tx).to.changeEtherBalances([player2], [expectedNetGain], { includeFee: false });
    expect(await contract.feePool()).to.equal(totalFee);
  });

  it("refunds on draw", async () => {
    const { contract, player1, player2 } = await deploy();
    const stake = ethers.parseEther("0.5");
    const gameId = ethers.id("draw-game");

    await contract.connect(player1).submitMove(gameId, 1, { value: stake });
    await expect(() => contract.connect(player2).submitMove(gameId, 1, { value: stake }))
      .to.changeEtherBalances([player2], [0n], { includeFee: false });
    expect(await contract.feePool()).to.equal(0n);
  });

  it("allows initiator to cancel", async () => {
    const { contract, player1 } = await deploy();
    const stake = ethers.parseEther("0.25");
    const gameId = ethers.id("cancel-game");

    await contract.connect(player1).submitMove(gameId, 3, { value: stake });
    await expect(() => contract.connect(player1).cancel(gameId)).to.changeEtherBalances([player1], [0n], {
      includeFee: false,
    });
  });

  it("refunds after timeout", async () => {
    const { contract, player1 } = await deploy();
    const stake = ethers.parseEther("0.2");
    const gameId = ethers.id("timeout-game");
    await contract.connect(player1).submitMove(gameId, 2, { value: stake });
    await time.increase(timeout + 1);
    await expect(() => contract.connect(player1).claimTimeout(gameId)).to.changeEtherBalances([player1], [0n], {
      includeFee: false,
    });
  });

  it("lets owner withdraw fees", async () => {
    const { contract, owner, player1, player2 } = await deploy();
    const stake = ethers.parseEther("1");
    const gameId = ethers.id("fees-game");
    await contract.connect(player1).submitMove(gameId, 1, { value: stake });
    await contract.connect(player2).submitMove(gameId, 2, { value: stake });
    const pool = await contract.feePool();
    await expect(() => contract.connect(owner).withdrawFees(owner.address, pool)).to.changeEtherBalances(
      [owner],
      [pool],
      { includeFee: false },
    );
    expect(await contract.feePool()).to.equal(0n);
  });
});

