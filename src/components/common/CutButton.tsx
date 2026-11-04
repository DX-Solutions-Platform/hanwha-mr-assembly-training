'use client';
import styled, { css } from 'styled-components';
import { cutCorner } from '@/styles/mixins';

type ButtonVariant = 'primary' | 'outline';

export const CutButton = styled.button<{ $variant?: ButtonVariant; $height?: number }>`
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  height: ${({ $height = 56 }) => $height}px; padding: 0 28px;
  font-size: ${({ theme }) => theme.size.base}px; font-weight: ${({ theme }) => theme.weight.bold};
  transition: filter ${({ theme }) => theme.motion.fast}, background ${({ theme }) => theme.motion.fast};
  ${({ theme }) => cutCorner(theme.cut.md)};
  ${({ $variant = 'primary', theme }) => $variant === 'primary'
    ? css`background: ${theme.color.primary}; color: ${theme.color.onPrimary}; &:hover { filter: brightness(1.1); }`
    : css`border: 1px solid ${theme.color.primaryLine}; color: ${theme.color.ink}; font-weight: ${theme.weight.regular}; &:hover { background: ${theme.color.primaryFill}; }`}
  &:disabled { background: rgba(243,115,33,.18); color: rgba(242,237,232,.5); cursor: not-allowed; filter: none; }
`;
