'use client';
import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  @font-face { font-family: 'NexonLv2Gothic'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/NEXON Lv2 Gothic.woff') format('woff'); font-weight: 400; font-display: swap; }
  @font-face { font-family: 'NexonLv2Gothic'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/NEXON Lv2 Gothic Bold.woff') format('woff'); font-weight: 700; font-display: swap; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #000; color: ${({ theme }) => theme.color.ink}; font-family: ${({ theme }) => theme.font.main}; -webkit-font-smoothing: antialiased; }
  b, strong, h1, h2, h3, h4 { font-weight: ${({ theme }) => theme.weight.bold}; }
  a { color: ${({ theme }) => theme.color.primary}; text-decoration: none; }
  a:hover { color: ${({ theme }) => theme.color.primarySoft}; }
  button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
`;
