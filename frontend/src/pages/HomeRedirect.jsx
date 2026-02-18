import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { apiGet } from '../api/client'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HomeRedirect() {
  const navigate = useNavigate()
  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: () => apiGet('/boards'),
  })

  useEffect(() => {
    if (boardsQuery.data?.length) {
      navigate(`/boards/${boardsQuery.data[0].slug}`, { replace: true })
    }
  }, [boardsQuery.data, navigate])

  if (boardsQuery.isLoading) {
    return <LoadingSpinner />
  }

  if (!boardsQuery.data?.length) {
    return <EmptyState title="게시판이 없습니다" description="관리자 모드에서 게시판을 먼저 생성하세요." />
  }

  return null
}
