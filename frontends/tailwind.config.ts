
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Custom animal-inspired palette
				forest: {
					50: '#f0f9f4',
					100: '#dcf2e4',
					200: '#bce5cd',
					300: '#8bd2ac',
					400: '#52b883',
					500: '#2d9d63',
					600: '#1f7f4f',
					700: '#1a6641',
					800: '#175236',
					900: '#14432c',
				},
				earth: {
					50: '#faf8f3',
					100: '#f4f0e6',
					200: '#e8ddc7',
					300: '#d9c5a0',
					400: '#c8a677',
					500: '#bc935a',
					600: '#b0834e',
					700: '#926a42',
					800: '#76553a',
					900: '#614630',
				},
				amber: {
					50: '#fffdf7',
					100: '#fffaeb',
					200: '#fff3c6',
					300: '#ffe897',
					400: '#ffd558',
					500: '#ffc62b',
					600: '#f2a611',
					700: '#c87d0e',
					800: '#a06214',
					900: '#835117',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-right': {
					'0%': {
						opacity: '0',
						transform: 'translateX(50px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'pulse-glow': {
					'0%, 100%': {
						boxShadow: '0 0 5px rgba(45, 157, 99, 0.4)'
					},
					'50%': {
						boxShadow: '0 0 20px rgba(45, 157, 99, 0.8)'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-10px)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in-up': 'fade-in-up 0.5s ease-out',
				'slide-in-right': 'slide-in-right 0.6s ease-out',
				'pulse-glow': 'pulse-glow 2s infinite',
				'float': 'float 3s ease-in-out infinite'
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
				'forest-gradient': 'linear-gradient(135deg, #1f7f4f 0%, #2d9d63 50%, #52b883 100%)',
				'earth-gradient': 'linear-gradient(135deg, #926a42 0%, #bc935a 50%, #d9c5a0 100%)',
				'amber-gradient': 'linear-gradient(135deg, #c87d0e 0%, #ffc62b 50%, #ffe897 100%)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
