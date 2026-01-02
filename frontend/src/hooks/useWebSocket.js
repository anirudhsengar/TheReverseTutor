import { useState, useEffect, useCallback, useRef } from 'react'

export default function useWebSocket(path, { onOpen, onClose, onMessage } = {}) {
    const [isConnected, setIsConnected] = useState(false)
    const wsRef = useRef(null)

    // Keep refs to callbacks to avoid reconnects when callbacks change
    const onOpenRef = useRef(onOpen)
    const onCloseRef = useRef(onClose)
    const onMessageRef = useRef(onMessage)

    useEffect(() => {
        onOpenRef.current = onOpen
        onCloseRef.current = onClose
        onMessageRef.current = onMessage
    }, [onOpen, onClose, onMessage])

    // Connect on mount
    useEffect(() => {
        let timeoutId;

        const connect = () => {
            // Determine WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const host = window.location.host
            const url = `${protocol}//${host}${path}`

            try {
                const ws = new WebSocket(url)
                wsRef.current = ws

                ws.onopen = () => {
                    console.log('WebSocket connected')
                    setIsConnected(true)
                    onOpenRef.current?.()
                }

                ws.onclose = () => {
                    console.log('WebSocket disconnected')
                    setIsConnected(false)
                    onCloseRef.current?.()

                    // Reconnect after delay
                    timeoutId = setTimeout(() => {
                        connect()
                    }, 3000)
                }

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error)
                }

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)
                        onMessageRef.current?.(data)
                    } catch (e) {
                        console.error('Failed to parse message:', e)
                    }
                }
            } catch (error) {
                console.error('Failed to connect:', error)

                // Retry connection
                timeoutId = setTimeout(() => {
                    connect()
                }, 3000)
            }
        }

        connect()

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
    }, [path])

    // Send message
    const sendMessage = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data))
        } else {
            console.warn('WebSocket not connected')
        }
    }, [])

    // Send binary data (for audio)
    const sendBinary = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(data)
        }
    }, [])

    return {
        isConnected,
        sendMessage,
        sendBinary,
    }
}
