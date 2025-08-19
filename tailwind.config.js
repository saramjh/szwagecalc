/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
	safelist: [
		// 다크모드 핵심 클래스들 강제 포함
		'dark:bg-gray-800',
		'dark:bg-gray-900', 
		'dark:bg-gray-700',
		'dark:text-white',
		'dark:text-gray-300',
		'dark:text-light-gray',
		'dark:border-gray-700',
		'dark:border-gray-600',
		'dark:hover:bg-gray-700',
		'dark:hover:bg-gray-600',
		'dark:shadow-lg',
		'dark:shadow-xl',
		'dark:shadow-2xl',
		'dark:shadow-black/50',
		'dark:bg-opacity-70',
		'dark:from-deep-navy',
		'dark:to-charcoal-gray',
		// 패턴 기반 포함
		{
			pattern: /dark:(bg|text|border|shadow|from|to)-(gray|white|black)/,
		},
	],
	theme: {
		extend: {
			colors: {
				// 브랜드 컬러
				"mint-green": "#4ED6B8",
				"mint-green-dark": "#3CA08A", // mint-green의 어두운 버전
				"lemon-yellow": "#FFE27A",
				"lemon-yellow-dark": "#CCB562", // lemon-yellow의 어두운 버전
				"coral-pink": "#FF8C94",
				"coral-pink-light": "#FFD1D4", // coral-pink의 밝은 버전

				// 라이트 모드
				"cream-white": "#FFFDF7",
				"dark-navy": "#2D3142",
				"medium-gray": "#6B7280",

				// 다크 모드
				"deep-navy": "#000000",
				"charcoal-gray": "#2C313C",
				"light-gray": "#A1A6B2",
			},
			backgroundSize: {
				// 배경 크기 확장
				"200%": "200% auto",
			},
			keyframes: {
				"gradient-flow": {
					"0%": { backgroundPosition: "0% 50%" },
					"50%": { backgroundPosition: "100% 50%" },
					"100%": { backgroundPosition: "0% 50%" },
				},
			},
			animation: {
				"gradient-flow": "gradient-flow 5s ease infinite",
			},
		},
	},
	plugins: [],
	darkMode: "class",
}
