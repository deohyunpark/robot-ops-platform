import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type CSSProperties,
  type MouseEvent,
  type MouseEventHandler,
} from "react"

function randomColor(): string {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`
}

type BackgroundState = { background: string }

let backgroundState: BackgroundState = { background: "#0099FF" }
const backgroundListeners = new Set<() => void>()

function subscribeBackground(listener: () => void) {
  backgroundListeners.add(listener)
  return () => backgroundListeners.delete(listener)
}

function getBackgroundSnapshot(): BackgroundState {
  return backgroundState
}

function setBackgroundState(patch: Partial<BackgroundState>) {
  backgroundState = { ...backgroundState, ...patch }
  for (const listener of backgroundListeners) listener()
}

function useBackgroundStore() {
  const state = useSyncExternalStore(
    subscribeBackground,
    getBackgroundSnapshot,
    getBackgroundSnapshot
  )
  const setStore = useCallback((patch: Partial<BackgroundState>) => {
    setBackgroundState(patch)
  }, [])
  return [state, setStore] as const
}

type WithStyleProps = {
  style?: CSSProperties
  onClick?: MouseEventHandler<Element>
}

export function withRotate<P extends WithStyleProps>(
  Component: ComponentType<P>
): ComponentType<P> {
  const Wrapped = forwardRef<unknown, P>(function WithRotate(props, ref) {
    const [deg, setDeg] = useState(0)

    useEffect(() => {
      const id = requestAnimationFrame(() => setDeg(90))
      return () => cancelAnimationFrame(id)
    }, [])

    const { style, ...rest } = props
    return (
      <Component
        ref={ref}
        {...({
          ...rest,
          style: {
            ...style,
            transform: `rotate(${deg}deg)`,
            transition: "transform 2s",
          },
        } as unknown as P)}
      />
    )
  })
  Wrapped.displayName = `withRotate(${getComponentLabel(Component as ComponentType<WithStyleProps>)})`
  return Wrapped as unknown as ComponentType<P>
}

export function withHover<P extends WithStyleProps>(
  Component: ComponentType<P>
): ComponentType<P> {
  const Wrapped = forwardRef<unknown, P>(function WithHover(props, ref) {
    return (
      <span
        style={{
          display: "inline-block",
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = ""
        }}
      >
        <Component ref={ref} {...(props as unknown as P)} />
      </span>
    )
  })
  Wrapped.displayName = `withHover(${getComponentLabel(Component as ComponentType<WithStyleProps>)})`
  return Wrapped as unknown as ComponentType<P>
}

export function withRandomColor<P extends WithStyleProps>(
  Component: ComponentType<P>
): ComponentType<P> {
  const Wrapped = forwardRef<unknown, P>(function WithRandomColor(props, ref) {
    const [store, setStore] = useBackgroundStore()
    const { style, onClick, ...rest } = props

    return (
      <Component
        ref={ref}
        {...({
          ...rest,
          style: {
            ...style,
            backgroundColor: store.background,
            transition: "background-color 0.35s ease",
          },
          onClick: (e: MouseEvent<Element>) => {
            onClick?.(e)
            setStore({ background: randomColor() })
          },
        } as unknown as P)}
      />
    )
  })
  Wrapped.displayName = `withRandomColor(${getComponentLabel(Component as ComponentType<WithStyleProps>)})`
  return Wrapped as unknown as ComponentType<P>
}

function getComponentLabel(Component: ComponentType<WithStyleProps>): string {
  if (typeof Component === "function") {
    return Component.displayName ?? Component.name ?? "Component"
  }
  const named = Component as { displayName?: string }
  return named.displayName ?? "Component"
}
