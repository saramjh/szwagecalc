const isLocalhost = Boolean(
	window.location.hostname === "localhost" ||
		// [::1] is the IPv6 localhost address.
		window.location.hostname === "[::1]" ||
		// 127.0.0.0/8 are considered localhost for IPv4.
		window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
)

// 2025-07-05-2: Force cache refresh for serviceWorkerRegistration.js

export function register(config) {
	if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
		// The URL constructor is available in all browsers that support SW.
		const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href)
		if (publicUrl.origin !== window.location.origin) {
			// Our service worker won't work if PUBLIC_URL is on a different origin
			// from what our page is served on. This might happen if a CDN is used to
			// serve assets; see https://github.com/facebook/create-react-app/issues/2374
			return
		}

		window.addEventListener("load", () => {
			const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`

			if (isLocalhost) {
				// This is running on localhost. Let's check if a service worker still exists or not.
				checkValidServiceWorker(swUrl, config)

				// Add some additional logging to localhost, pointing developers to the
				// service worker/PWA documentation.
				navigator.serviceWorker.ready.then(() => {})
			} else {
				// Is not localhost. Just register service worker
				registerValidSW(swUrl, config)
			}
		})
	}
}

function registerValidSW(swUrl, config) {
	navigator.serviceWorker
		.register(swUrl)
		.then((registration) => {
			registration.onupdatefound = () => {
				const installingWorker = registration.installing
				if (installingWorker == null) {
					return
				}
				installingWorker.onstatechange = () => {
					if (installingWorker.state === "installed") {
						if (navigator.serviceWorker.controller) {
							// 새 업데이트 사용 가능
							console.log("🚀 새 업데이트가 있습니다! 새로고침하여 최신 기능을 사용하세요.")

							// Execute callback
							if (config && config.onUpdate) {
								config.onUpdate(registration)
							} else {
								// 기본 업데이트 처리
								if (window.confirm('새 업데이트가 있습니다. 지금 새로고침하시겠습니까?')) {
									window.location.reload()
								}
							}
						} else {
							// 초기 설치 완료
							console.log("💾 시급이요가 오프라인에서도 사용 가능합니다.")

							// Execute callback
							if (config && config.onSuccess) {
								config.onSuccess(registration)
							}
						}
					}
				}
			}
		})
		.catch((error) => {
			console.error("Error during service worker registration:", error)
		})
}

function checkValidServiceWorker(swUrl, config) {
	// Check if the service worker can be found. If it can't reload the page.
	fetch(swUrl, {
		headers: { "Service-Worker": "script" },
	})
		.then((response) => {
			// Ensure service worker exists, and that we really are getting a JS file.
			const contentType = response.headers.get("content-type")
			if (response.status === 404 || (contentType != null && contentType.indexOf("javascript") === -1)) {
				// No service worker found. Probably a different app. Reload the page.
				navigator.serviceWorker.ready.then((registration) => {
					registration.unregister().then(() => {
						window.location.reload()
					})
				})
			} else {
				// Service worker found. Proceed as normal.
				registerValidSW(swUrl, config)
			}
		})
		.catch(() => {
			console.log("No internet connection found. App is running in offline mode.")
		})
}

export function unregister() {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.ready
			.then((registration) => {
				registration.unregister()
			})
			.catch((error) => {
				console.error(error.message)
			})
	}
}
