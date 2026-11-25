import { useTheme } from "../../contexts/ThemeContext";

const LIGHT_COLORS = ['#64748b', '#3b82f6', '#10b981', '#14b8a6', '#f43f5e', '#94a3b8'];
const DARK_COLORS = ['#475569', '#2563eb', '#059669', '#0d9488', '#e11d48', '#334155'];

/** Recharts styling derived from the active theme, shared by every analytics card. */
export function useChartTheme() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return {
    isDarkMode,
    colors: isDarkMode ? DARK_COLORS : LIGHT_COLORS,
    axisStyle: { fill: isDarkMode ? '#64748b' : '#94a3b8' },
    gridColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    tooltipStyle: {
      borderRadius: '12px',
      border: 'none',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      color: isDarkMode ? '#f8fafc' : '#1e293b',
    },
    tooltipItemStyle: { color: isDarkMode ? '#f8fafc' : '#1e293b' },
    tooltipCursorFill: isDarkMode ? '#1e293b' : '#f8fafc',
  };
}
