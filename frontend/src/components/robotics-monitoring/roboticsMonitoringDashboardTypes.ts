import type { CSSProperties } from "react"

export type DeviceStatus =
  | "Online"
  | "Offline"
  | "Warning"
  | "Error"
  | "Maintenance"

export type Device = {
  id: string
  name: string
  site: string
  model: string
  status: DeviceStatus
  battery: number
  temperature: number
  lastSeenMinutes: number
  emergency: boolean
  errorRate: number
}

export type RoboticsDashboardFont = CSSProperties

export interface RoboticsMonitoringDashboardProps {
  title: string
  subtitle: string
  devices: Device[]
  language: "en" | "ko"
  enableChat: boolean
  chatTitle: string
  chatPlaceholder: string
  groupBySite: boolean
  enableRealtimeSimulation: boolean
  refreshMs: number
  filterOffline: boolean
  filterLowBattery: boolean
  filterAbnormalTemp: boolean
  filterEmergency: boolean
  lowBatteryThreshold: number
  abnormalTempThreshold: number
  background: string
  panelBackground: string
  cardBackground: string
  borderColor: string
  textPrimary: string
  textSecondary: string
  statusOnline: string
  statusOffline: string
  statusWarning: string
  statusError: string
  statusMaintenance: string
  accent: string
  headingFont: RoboticsDashboardFont
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  showSearch: boolean
  showKPIs: boolean
  showFilters: boolean
  showDetailPanel: boolean
  initialSelectedId: string
  style?: CSSProperties
}
