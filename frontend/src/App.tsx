import RoboticsMonitoringDashboard from "./components/robotics-monitoring/RoboticsMonitoringDashboard"
import "./App.css"

export default function App() {
  return (
    <div className="app-dashboard-root">
      <RoboticsMonitoringDashboard
        style={{ width: "100%", height: "100%", minHeight: "100%" }}
      />
    </div>
  )
}
