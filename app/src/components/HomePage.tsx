"use client";

import { WalletStatus } from "./WalletStatus";

interface HomePageProps {
  onStartGame: () => void;
  onHowToPlay?: () => void;
  userAvatar?: string;
  username?: string;
  startDisabled?: boolean;
}

export function HomePage({ onStartGame, onHowToPlay, userAvatar, username, startDisabled = false }: HomePageProps) {
  return (
    <div className="relative flex h-screen min-h-screen w-full flex-col items-center justify-between bg-[#101018] p-6 overflow-hidden">
      <WalletStatus />
      {/* Farcaster Avatar - Top Right */}
      {userAvatar && (
        <div className="absolute top-6 right-6 z-20">
          <div className="relative w-12 h-12 rounded-full border-2 border-[#1D3557]/20 bg-white/10 backdrop-blur-sm shadow-lg overflow-hidden">
            <img
              src={userAvatar}
              alt={username || "User"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to a default avatar if image fails to load
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      )}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAPBLm6ipEn6C0e-5pfm1Tqe-jWS94QrPRbKXsz1Lrt4Mlr33Vz62bIPxG8RWXETmrdBDAwKsLW5XPDQ6DCeKB2JGILk8jJ4d2askCR4F54STvtDuYothpkrB0VUETiwnrm0NxjZl9PduprbVPyrSFmeEhiEQneL__mFLbR3LlvAE779NmExy9hM_ufCors5q9yu8fgJ3dOFP19MNrP2oERQF4I9C8QmqeihiyMuZTRmgbMzb_kXjbZyfNlVptRN7lPMiN7imknf-g')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#101018]/50 via-[#101018] to-[#101018]/50" />
      <div className="z-10 flex flex-col items-center justify-center flex-grow pt-20 text-center">
        <div className="flex items-center justify-center space-x-2">
          <div className="text-[8rem] font-black leading-none text-[#E63946] [text-shadow:-3px_-3px_0_#101018,3px_-3px_0_#101018,-3px_3px_0_#101018,3px_3px_0_#101018,4px_4px_0px_#1D3557]">
            ジ
          </div>
          <div className="text-[8rem] font-black leading-none text-[#E63946] [text-shadow:-3px_-3px_0_#101018,3px_-3px_0_#101018,-3px_3px_0_#101018,3px_3px_0_#101018,4px_4px_0px_#1D3557]">
            ャ
          </div>
          <div className="text-[8rem] font-black leading-none text-[#E63946] [text-shadow:-3px_-3px_0_#101018,3px_-3px_0_#101018,-3px_3px_0_#101018,3px_3px_0_#101018,4px_4px_0px_#1D3557]">
            ン
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white -mt-2 tracking-wider">JanKen</h1>
        <p className="text-white/70 text-lg mt-1">The Ultimate Showdown</p>
      </div>
      <div className="z-10 w-full max-w-sm pb-8">
        <div className="flex flex-col items-stretch gap-4 px-4">
          <button
            onClick={onStartGame}
            disabled={startDisabled}
            className="flex min-w-[84px] items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[#E63946] text-white text-lg font-bold leading-normal tracking-wide shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.05)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="truncate">START NEW GAME</span>
          </button>
          {onHowToPlay && (
            <button
              onClick={onHowToPlay}
              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[#A8DADC] text-[#101018] text-lg font-bold leading-normal tracking-wide shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.05)] transition-shadow"
            >
              <span className="truncate">HOW TO PLAY</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
