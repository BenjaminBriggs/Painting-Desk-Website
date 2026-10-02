// Shared Tailwind theme. Load right after the Tailwind CDN script.
// Colours are the app's tokens (../Plinth/docs/DESIGN.md): Wada 303, a neutral grey ground, slate-olive ink,
// peach red for the one action and Naples yellow for highlights.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        paper: '#F3F2F0',
        card: '#FAFAF9',
        soft: '#E0E0DC',
        track: '#DAD9D5',
        border: '#D4D3CF',
        rule: '#CCCBC7',
        plinth: '#B6BFC1',
        faint: '#AEADAB',
        muted: '#4B5445',
        ink: '#1C251A',
        // The accent as text (deepened peach red), and as the one action's fill (true peach red, ink on it)
        accent: '#B74424',
        accentFill: '#F15A30',
        accentTint: '#FBE6A0'
      },
      fontFamily: {
        // Instrument Serif names things; the system face is for reading.
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif']
      }
    }
  }
};
