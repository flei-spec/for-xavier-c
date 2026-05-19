import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  captureLocation,
  refreshMyLocation,
  fetchSpaceLocations,
  haversineKm,
  formatDistanceKm,
  formatRelativeTime,
  normalizeCityName,
} from '../lib/memberLocations'
import './DistanceCard.css'

export default function DistanceCard() {
  const { user, space } = useAuth()

  const [show,       setShow]       = useState(false)  // confirmed 2-member space
  const [myLoc,      setMyLoc]      = useState(null)
  const [theirLoc,   setTheirLoc]   = useState(null)
  const [loaded,     setLoaded]     = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const applyLocations = useCallback((locs) => {
    if (!user) return
    setMyLoc   (locs.find(l => l.user_id === user.id)  ?? null)
    setTheirLoc(locs.find(l => l.user_id !== user.id)  ?? null)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !space) return

    // 1. Confirm this is a 2-member space via get_my_space RPC
    supabase.rpc('get_my_space').then(({ data }) => {
      const count = data?.member_count ?? 0
      if (count !== 2) return  // not a couple space — stay hidden

      setShow(true)

      // 2. Load existing locations immediately (shows current state right away)
      fetchSpaceLocations(space.id).then(locs => {
        applyLocations(locs)
        setLoaded(true)
      })

      // 3. Capture current location once per session, then refresh if saved
      captureLocation(user.id, space.id).then(saved => {
        if (saved) {
          fetchSpaceLocations(space.id).then(locs => {
            applyLocations(locs)
          })
        }
      })
    })
  }, [user?.id, space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(async () => {
    if (!user || !space || refreshing) return
    setRefreshing(true)
    await refreshMyLocation(user.id, space.id)
    const locs = await fetchSpaceLocations(space.id)
    applyLocations(locs)
    setRefreshing(false)
  }, [user?.id, space?.id, refreshing, applyLocations]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null

  const bothPresent = myLoc !== null && theirLoc !== null
  const distanceKm  = bothPresent
    ? haversineKm(myLoc.latitude, myLoc.longitude, theirLoc.latitude, theirLoc.longitude)
    : null

  // normalizeCityName cleans any dirty values already stored in the DB
  const myCity    = normalizeCityName(myLoc?.city)    || null
  const theirCity = normalizeCityName(theirLoc?.city) || null

  const myUpdated = formatRelativeTime(myLoc?.updated_at)

  return (
    <div className="dist-card">
      <p className="dist-card__title">我们之间</p>

      {!loaded || refreshing ? (
        <div className="dist-card__dots"><span /><span /><span /></div>
      ) : bothPresent ? (
        <>
          <p className="dist-card__cities">
            我在{myCity || '某处'}，对方在{theirCity || '某处'}
          </p>
          <p className="dist-card__distance">
            相隔 <strong>{formatDistanceKm(distanceKm)}</strong>
          </p>
          <p className="dist-card__caption">
            {myUpdated ? `我的位置：${myUpdated}` : '以上次打开网站的位置为准'}
          </p>
          <button className="dist-card__refresh" onClick={handleRefresh}>
            📍 更新我的位置
          </button>
        </>
      ) : myLoc ? (
        <>
          <p className="dist-card__waiting">正在等你回来…</p>
          <p className="dist-card__caption">对方下次打开网站时<br />就能看到我们的距离了</p>
          <button className="dist-card__refresh" onClick={handleRefresh}>
            📍 更新我的位置
          </button>
        </>
      ) : theirLoc ? (
        <>
          <p className="dist-card__waiting">对方在{theirCity || '某处'}留下了位置</p>
          <p className="dist-card__caption">允许位置访问后<br />就能看到你们的距离了</p>
          <button className="dist-card__refresh" onClick={handleRefresh}>
            📍 更新我的位置
          </button>
        </>
      ) : (
        <>
          <p className="dist-card__waiting">等两个人都来过这里</p>
          <p className="dist-card__caption">就能看到你们相隔多远</p>
        </>
      )}
    </div>
  )
}
