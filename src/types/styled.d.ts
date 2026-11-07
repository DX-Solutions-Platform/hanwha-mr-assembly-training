import 'styled-components';
import type { AppTheme } from '@/styles/theme';
declare module 'styled-components' {
  export interface DefaultTheme {
    color: AppTheme['color']; font: AppTheme['font']; weight: AppTheme['weight'];
    size: AppTheme['size']; space: AppTheme['space']; cut: AppTheme['cut'];
    motion: AppTheme['motion']; stage: AppTheme['stage'];
  }
}
