import React from "react";
import { GraduationCap, Target, TrendingUp } from "lucide-react";
import GradientTransition from "@/components/GradientTransition";

const Header = () => {
  return (
    <>
      <header className="relative w-full hero-gradient py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white">enemfodao</h1>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl text-white/90 max-w-2xl leading-relaxed">
              Prepare-se para o ENEM com questões de anos anteriores
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-white/80 max-w-3xl leading-relaxed">
              Pratique com questões reais, receba feedback imediato e acompanhe seu progresso em todas as áreas do
              conhecimento.
            </p>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-8">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Target className="h-4 w-4 text-white" />
                <span className="text-white font-medium text-sm sm:text-base">2500+ Questões</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <TrendingUp className="h-4 w-4 text-white" />
                <span className="text-white font-medium text-sm sm:text-base">Feedback Imediato</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <GradientTransition opacity={1} />
    </>
  );
};

export default Header;