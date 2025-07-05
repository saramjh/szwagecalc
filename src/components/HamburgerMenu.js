import React, { useState, useEffect, useRef } from 'react';

const HamburgerMenu = ({ session, onLogout, username, onOpenJobManagementModal, deferredPrompt, onInstallPWA }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const menuRef = useRef(null); // 메뉴 컨테이너를 참조할 ref

  useEffect(() => {
    // localStorage에서 사용자 설정 모드를 읽어옴
    const storedMode = localStorage.getItem('theme');

    if (storedMode) {
      // 저장된 설정이 있으면 해당 설정을 적용
      const isStoredDarkMode = storedMode === 'dark';
      setIsDarkMode(isStoredDarkMode);
      if (isStoredDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // 저장된 설정이 없으면 시스템 설정에 따름
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDarkMode);
      if (prefersDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // 시스템 설정 변경 감지 (사용자 설정이 없을 때만)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) { // 사용자 설정이 없을 때만 시스템 설정에 반응
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    // 외부 클릭 감지
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]); // isOpen이 변경될 때마다 useEffect 재실행

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark'); // 설정 저장
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light'); // 설정 저장
    }
  };

  const userProfilePic = session?.user?.user_metadata?.avatar_url;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md text-dark-navy dark:text-white hover:bg-gray-200 dark:hover:bg-charcoal-gray focus:outline-none focus:ring-2 focus:ring-mint-green transition-all duration-200 ease-in-out"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-cream-white dark:bg-charcoal-gray rounded-md shadow-lg py-1 z-50 transition-all duration-300 ease-out transform origin-top-right scale-100">
          {session && userProfilePic && (
            <div className="p-4 flex flex-col items-center border-b border-gray-200 dark:border-gray-700">
              <img
                src={userProfilePic}
                alt="User Profile"
                className="w-16 h-16 rounded-full mb-2 border-2 border-mint-green"
              />
              <p className="text-sm font-semibold text-dark-navy dark:text-white">{username || session.user.email}</p>
            </div>
          )}
          <button
            onClick={toggleDarkMode}
            className="block w-full text-left px-4 py-2 text-dark-navy dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            {isDarkMode ? '라이트 모드' : '다크 모드'}
          </button>
          <button
            onClick={() => { setIsOpen(false); onOpenJobManagementModal(); }}
            className="block w-full text-left px-4 py-2 text-dark-navy dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            직업 관리
          </button>
          {deferredPrompt && (
            <button
              onClick={() => { setIsOpen(false); onInstallPWA(); }}
              className="block w-full text-left px-4 py-2 text-dark-navy dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              홈 화면에 추가
            </button>
          )}
          <button
            onClick={() => { setIsOpen(false); onLogout(); }}
            className="block w-full text-left px-4 py-2 text-dark-navy dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
};

export default HamburgerMenu;
