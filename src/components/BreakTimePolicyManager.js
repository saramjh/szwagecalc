import React, { useState, useEffect } from "react"
// 🚀 트리셰이킹 최적화: 개별 import
import { PlusIcon, Trash2Icon } from "lucide-react"
import { DEFAULT_BREAK_POLICIES, createBreakPolicy, validateBreakPolicies, formatBreakTime } from "../utils/breakTime"

/**
 * 🎨 이토스 토스 스타일 휴게시간 정책 관리 컴포넌트
 * 
 * 디자인 철학:
 * 1. 점진적 정보 공개 (Progressive Disclosure)
 * 2. 실시간 피드백 
 * 3. 직관적인 시각적 계층구조
 * 4. 모바일 우선 터치 친화적 인터페이스
 */
const BreakTimePolicyManager = ({ 
  policies = DEFAULT_BREAK_POLICIES, 
  onPoliciesChange,
  enabled = true,
  onEnabledChange,
  paid = false,
  onPaidChange 
}) => {
  const [localPolicies, setLocalPolicies] = useState(policies)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  useEffect(() => {
    setLocalPolicies(policies)
  }, [policies])

  // 정책 변경 핸들러
  const handlePolicyChange = (index, field, value) => {
    const newPolicies = [...localPolicies]
    newPolicies[index] = { ...newPolicies[index], [field]: Number(value) }
    setLocalPolicies(newPolicies)
    
    if (validateBreakPolicies(newPolicies)) {
      onPoliciesChange(newPolicies)
    }
  }

  // 정책 추가
  const handleAddPolicy = () => {
    const lastPolicy = localPolicies[localPolicies.length - 1]
    const newPolicy = createBreakPolicy(
      lastPolicy ? lastPolicy.maxHours : 0,
      lastPolicy ? lastPolicy.maxHours + 4 : 4,
      30
    )
    const newPolicies = [...localPolicies, newPolicy]
    setLocalPolicies(newPolicies)
    onPoliciesChange(newPolicies)
  }

  // 정책 삭제
  const handleDeletePolicy = (index) => {
    if (localPolicies.length <= 1) return // 최소 1개 정책은 유지
    
    const newPolicies = localPolicies.filter((_, i) => i !== index)
    setLocalPolicies(newPolicies)
    onPoliciesChange(newPolicies)
  }

  // 기본값으로 리셋
  const handleResetToDefault = () => {
    setLocalPolicies(DEFAULT_BREAK_POLICIES)
    onPoliciesChange(DEFAULT_BREAK_POLICIES)
  }

  return (
    <div className="space-y-4">
      {/* 🎯 이토스 디자인: 메인 토글 - 가장 눈에 띄는 위치 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dark-navy dark:text-white">휴게시간 정책</h3>
          <p className="text-sm text-medium-gray dark:text-light-gray mt-1">
            근로기준법에 따른 자동 휴게시간 적용
          </p>
        </div>
        
        {/* 토스 스타일 토글 스위치 */}
        <button
          onClick={() => onEnabledChange(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-offset-2 ${
            enabled ? 'bg-mint-green' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 활성화된 경우에만 세부 설정 표시 */}
      {enabled && (
        <>
          {/* 💰 급여 포함/제외 설정 */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-dark-navy dark:text-white">
                휴게시간 급여 포함
              </p>
              <p className="text-xs text-medium-gray dark:text-light-gray mt-0.5">
                휴게시간도 급여에 포함하여 계산합니다
              </p>
            </div>
            
            <button
              onClick={() => onPaidChange(!paid)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                paid ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  paid ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 📋 현재 정책 요약 표시 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-dark-navy dark:text-white mb-2">
              현재 휴게시간 규칙
            </h4>
            <div className="space-y-2">
              {localPolicies.map((policy, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-medium-gray dark:text-light-gray">
                    {policy.minHours}시간 이상 ~ {policy.maxHours}시간 미만
                  </span>
                  <span className="font-medium text-dark-navy dark:text-white">
                    {formatBreakTime(policy.breakMinutes)}
                  </span>
                </div>
              ))}
            </div>

            {/* 🔧 고급 설정 토글 */}
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full mt-3 px-3 py-2 text-sm text-mint-green hover:bg-mint-green/10 rounded-lg transition-colors"
            >
              {isAdvancedOpen ? '간단히 보기' : '세부 설정 편집'}
            </button>
          </div>

          {/* 🛠️ 고급 설정 - 점진적 공개 (모바일 최적화) */}
          {isAdvancedOpen && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-dark-navy dark:text-white">
                  휴게시간 규칙 편집
                </h4>
                <button
                  onClick={handleResetToDefault}
                  className="text-xs text-medium-gray hover:text-dark-navy dark:hover:text-white transition-colors"
                >
                  기본값으로 복원
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {localPolicies.map((policy, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    {/* 최소 시간 */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={policy.minHours}
                        onChange={(e) => handlePolicyChange(index, 'minHours', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-mint-green bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
                        min="0"
                        step="0.5"
                      />
                    </div>

                    <div className="col-span-1 text-center text-xs text-medium-gray">~</div>

                    {/* 최대 시간 */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={policy.maxHours}
                        onChange={(e) => handlePolicyChange(index, 'maxHours', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-mint-green bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
                        min="0"
                        step="0.5"
                      />
                    </div>

                    <div className="col-span-1 text-center text-xs text-medium-gray">→</div>

                    {/* 휴게시간 */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={policy.breakMinutes}
                        onChange={(e) => handlePolicyChange(index, 'breakMinutes', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-mint-green bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
                        min="0"
                        step="5"
                      />
                    </div>

                    {/* 삭제 버튼 */}
                    <div className="col-span-1 flex justify-center">
                      {localPolicies.length > 1 && (
                        <button
                          onClick={() => handleDeletePolicy(index)}
                          className="p-1 text-coral-pink hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                        >
                          <Trash2Icon size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* 규칙 추가 버튼 */}
                <button
                  onClick={handleAddPolicy}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-medium-gray hover:border-mint-green hover:text-mint-green transition-colors flex items-center justify-center space-x-2"
                >
                  <PlusIcon size={16} />
                  <span>새 규칙 추가</span>
                </button>
              </div>

              {/* 💡 도움말 (컴팩트) */}
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  💡 근로기준법: 4~8시간→30분, 8시간이상→1시간
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BreakTimePolicyManager
