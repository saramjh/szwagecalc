import React, { createContext, useState, useCallback, useContext } from 'react';

const ReportCacheContext = createContext();

export const useReportCache = () => useContext(ReportCacheContext);

export const ReportCacheProvider = ({ children }) => {
  const [cache, setCache] = useState(new Map());

  const getCachedReport = useCallback((month, filterId) => {
    const cacheKey = `${month}-${filterId}`;
    return cache.get(cacheKey);
  }, [cache]);

  const setCachedReport = useCallback((month, filterId, data) => {
    const cacheKey = `${month}-${filterId}`;
    setCache(prevCache => {
      const newCache = new Map(prevCache);
      newCache.set(cacheKey, data);
      // Cache size limit to prevent memory leaks
      if (newCache.size > 20) {
        const oldestKey = newCache.keys().next().value;
        newCache.delete(oldestKey);
      }
      return newCache;
    });
  }, []);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const value = {
    getCachedReport,
    setCachedReport,
    clearCache,
  };

  return (
    <ReportCacheContext.Provider value={value}>
      {children}
    </ReportCacheContext.Provider>
  );
};
