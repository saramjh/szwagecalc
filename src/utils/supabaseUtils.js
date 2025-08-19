// 🚀 트리셰이킹 최적화: Supabase 공통 유틸리티
import { supabase } from '../supabaseClient'

/**
 * 작업(jobs) 관련 Supabase 함수들
 */
export const jobsApi = {
  // 모든 작업 조회
  async fetchAll(userId) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, job_name, description, payday, color, break_time_enabled, break_time_paid, break_time_policies, weekly_allowance_enabled, weekly_allowance_min_hours")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
    
    if (error) throw error
    return data
  },

  // 작업 생성
  async create(jobData) {
    const { data, error } = await supabase
      .from("jobs")
      .insert(jobData)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // 작업 수정
  async update(id, jobData) {
    const { data, error } = await supabase
      .from("jobs")
      .update(jobData)
      .eq("id", id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // 작업 삭제 (soft delete)
  async delete(id) {
    const { data, error } = await supabase
      .from("jobs")
      .update({ is_deleted: true })
      .eq("id", id)
    
    if (error) throw error
    return data
  }
}

/**
 * 근무 기록(work_records) 관련 Supabase 함수들
 */
export const workRecordsApi = {
  // 월별 근무 기록 조회
  async fetchByMonth(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from("work_records")
      .select(`
        *,
        jobs (
          id, job_name, color, hourly_rate, wage_type,
          break_time_enabled, break_time_paid, break_time_policies,
          weekly_allowance_enabled, weekly_allowance_min_hours
        )
      `)
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
    
    if (error) throw error
    return data
  },

  // 특정 날짜 근무 기록 조회
  async fetchByDate(userId, date) {
    const { data, error } = await supabase
      .from("work_records")
      .select(`
        *,
        jobs (
          id, job_name, color, hourly_rate, wage_type,
          break_time_enabled, break_time_paid, break_time_policies
        )
      `)
      .eq("user_id", userId)
      .eq("date", date)
      .order("start_time", { ascending: true })
    
    if (error) throw error
    return data
  },

  // 근무 기록 생성
  async create(recordData) {
    const { data, error } = await supabase
      .from("work_records")
      .insert(recordData)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // 근무 기록 수정
  async update(id, recordData) {
    const { data, error } = await supabase
      .from("work_records")
      .update(recordData)
      .eq("id", id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // 근무 기록 삭제
  async delete(id) {
    const { data, error } = await supabase
      .from("work_records")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    return data
  }
}

/**
 * 시급 히스토리(hourly_rate_history) 관련 Supabase 함수들
 */
export const hourlyRateHistoryApi = {
  // 특정 기간의 시급 히스토리 조회
  async fetchByDateRange(jobIds, startDate, endDate) {
    const { data, error } = await supabase
      .from("hourly_rate_history")
      .select("*")
      .in("job_id", jobIds)
      .lte("effective_date", endDate)
      .gte("effective_date", startDate)
      .order("effective_date", { ascending: false })
    
    if (error) throw error
    return data
  },

  // 특정 날짜 이전의 최근 시급 조회
  async fetchLatestBefore(jobId, date) {
    const { data, error } = await supabase
      .from("hourly_rate_history")
      .select("*")
      .eq("job_id", jobId)
      .lte("effective_date", date)
      .order("effective_date", { ascending: false })
      .limit(1)
    
    if (error) throw error
    return data[0] || null
  }
}

/**
 * 프로필(profiles) 관련 Supabase 함수들
 */
export const profilesApi = {
  // 프로필 조회
  async fetch(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .single()
    
    if (error && error.code !== "PGRST116") throw error
    return data
  },

  // 프로필 생성
  async create(profileData) {
    const { data, error } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
    
    if (error) throw error
    return data[0]
  }
}

// 인증 관련 유틸리티
export const authUtils = {
  // 현재 세션 가져오기
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // 인증 상태 변경 구독
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
