import React from "react";

interface SubtleGradientTransitionProps {
  direction?: "top" | "bottom";
  className?: string;
  height?: number;
}

const SubtleGradientTransition: React.FC<SubtleGradientTransitionProps> = ({ 
  direction = "bottom",
  className = "",
  height = 60
}) => {
  const gradient = "url(#subtle-gradient)";
  
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <svg 
        viewBox={`0 0 1200 ${height}`} 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        style={{ 
          transform: direction === "top" ? "scaleY(-1)" : "none",
          display: "block"
        }}
      >
        <defs>
          <linearGradient id="subtle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(217 91% 60%)" />
            <stop offset="50%" stopColor="hsl(280 100% 70%)" />
            <stop offset="100%" stopColor="hsl(142 71% 45%)" />
          </linearGradient>
        </defs>
        <path 
          d={`M0,0V${height/3}C13,${height/3 + 5},27.64,${height/3 + 10},47.69,${height/3 + 15}`} 
          fill={gradient}
          opacity="0.1"
        />
        <path 
          d={`M0,0V${height/6}C149.93,${height/6 + 10},314.09,${height/6 + 15},475.83,${height/6 + 5}`} 
          fill={gradient}
          opacity="0.05"
        />
      </svg>
    </div>
  );
};

export default SubtleGradientTransition;