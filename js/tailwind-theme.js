// Shared Tailwind theme. Load right after the Tailwind CDN script.
// Colours are the app's tokens (../Plinth/docs/DESIGN.md).
tailwind.config = {
  theme: {
    extend: {
      colors: {
        paper: '#F3EEE4',
        card: '#FAF7F0',
        soft: '#EBE4D6',
        track: '#E6DFD0',
        border: '#E0D8C8',
        rule: '#D8D0C2',
        plinth: '#CFC6B3',
        faint: '#B3A897',
        muted: '#6D6357',
        ink: '#1E1A16',
        accent: '#7A2E2E',
        accentTint: '#ECD9D3'
      },
      fontFamily: {
        // Instrument Serif names things; the system face is for reading.
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif']
      }
    }
  }
};
