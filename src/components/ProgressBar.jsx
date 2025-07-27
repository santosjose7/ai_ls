import React from 'react';

const ProgressBar = ({ progress }) => {
  // progress: number between 0 and 100
  return (
    <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mt-2 mb-4">
      <div
        className="h-full bg-green-500 transition-all duration-500"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
