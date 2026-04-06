"use client";

import { createTheme, MantineColorsTuple } from '@mantine/core';

const myColor: MantineColorsTuple = [
  '#eef3ff',
  '#dee2f2',
  '#bdc2de',
  '#98a0ca',
  '#7a84ba',
  '#6672b0',
  '#5c68ac',
  '#4c5897',
  '#424e88',
  '#364379',
];

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'var(--font-outfit), sans-serif',
  colors: {
    myColor,
  },
  components: {
    Card: {
      styles: (theme: any) => ({
        root: {
          backgroundColor: theme.colors.dark[7],
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: theme.shadows.lg,
          },
        },
      }),
    },
  },
});
