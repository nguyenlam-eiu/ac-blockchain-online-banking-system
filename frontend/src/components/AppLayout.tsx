import React from 'react';

export const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

export default AppLayout;
