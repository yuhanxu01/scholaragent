import React from 'react';
import { MainLayout } from '../layout/MainLayout';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children }) => {
  return <MainLayout>{children}</MainLayout>;
};