"use client"

import { useState, useEffect, useRef } from "react"

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Create a ref to track if this is the first render
  const isFirstRender = useRef(true)

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Read from localStorage only once on initial mount
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key)

      // Parse stored json or return initialValue
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error)
    }

    // Mark first render complete
    isFirstRender.current = false
  }, [key]) // Only run when key changes

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = (value: T) => {
    try {
      if (typeof window === "undefined") return

      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value

      // Save state only if the value has changed
      if (JSON.stringify(valueToStore) !== JSON.stringify(storedValue)) {
        setStoredValue(valueToStore)

        // Save to local storage
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error("Error writing to localStorage:", error)
    }
  }

  // Listen for changes in other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newValue = JSON.parse(e.newValue)
          // Only update if the value is different
          if (JSON.stringify(newValue) !== JSON.stringify(storedValue)) {
            setStoredValue(newValue)
          }
        } catch (error) {
          console.error("Error parsing localStorage value:", error)
        }
      }
    }

    // Add event listener
    window.addEventListener("storage", handleStorageChange)

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [key, storedValue]) // Include storedValue to properly compare with new values

  return [storedValue, setValue]
}
