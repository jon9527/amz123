import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AuthContextType {
    isLocked: boolean;
    hasPin: boolean;
    unlock: (pin: string) => boolean;
    lock: () => void;
    setPin: (newPin: string) => Promise<void>;
    clearPin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'amz123_auth_pin_hash';
const LOCK_STATE_KEY = 'amz123_lock_state';
const LAST_ACTIVITY_KEY = 'amz123_last_activity';
const AUTO_LOCK_MINUTES = 30;

// Simple hash function using SubtleCrypto
async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'amz123_salt_v1');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLocked, setIsLocked] = useState(true);
    const [hasPin, setHasPin] = useState(false);
    const [pinHash, setPinHash] = useState<string | null>(null);

    // Initialize from localStorage
    useEffect(() => {
        const storedHash = localStorage.getItem(AUTH_KEY);
        if (storedHash) {
            setHasPin(true);
            setPinHash(storedHash);
            // Check if was previously unlocked and not timed out
            const lockState = localStorage.getItem(LOCK_STATE_KEY);
            const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
            if (lockState === 'unlocked' && lastActivity) {
                const elapsed = Date.now() - parseInt(lastActivity, 10);
                if (elapsed < AUTO_LOCK_MINUTES * 60 * 1000) {
                    setIsLocked(false);
                }
            }
        } else {
            setHasPin(false);
            setIsLocked(true); // Show setup screen
        }
    }, []);

    // Track activity for auto-lock
    useEffect(() => {
        if (!isLocked) {
            const updateActivity = () => {
                localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
            };
            updateActivity();

            const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
            events.forEach(e => window.addEventListener(e, updateActivity));

            // Check for timeout every minute
            const interval = setInterval(() => {
                const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
                if (lastActivity) {
                    const elapsed = Date.now() - parseInt(lastActivity, 10);
                    if (elapsed >= AUTO_LOCK_MINUTES * 60 * 1000) {
                        setIsLocked(true);
                        localStorage.setItem(LOCK_STATE_KEY, 'locked');
                    }
                }
            }, 60000);

            return () => {
                events.forEach(e => window.removeEventListener(e, updateActivity));
                clearInterval(interval);
            };
        }
    }, [isLocked]);

    const unlock = useCallback((pin: string): boolean => {
        // Async hash comparison
        hashPin(pin).then(hash => {
            if (hash === pinHash) {
                setIsLocked(false);
                localStorage.setItem(LOCK_STATE_KEY, 'unlocked');
                localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
            }
        });
        // For immediate feedback, we return sync but actual unlock happens async
        // We'll handle this differently in the component
        return true; // Placeholder, actual check happens async
    }, [pinHash]);

    const lock = useCallback(() => {
        setIsLocked(true);
        localStorage.setItem(LOCK_STATE_KEY, 'locked');
    }, []);

    const setPin = useCallback(async (newPin: string) => {
        const hash = await hashPin(newPin);
        localStorage.setItem(AUTH_KEY, hash);
        setPinHash(hash);
        setHasPin(true);
        setIsLocked(false);
        localStorage.setItem(LOCK_STATE_KEY, 'unlocked');
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }, []);

    const clearPin = useCallback(() => {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(LOCK_STATE_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        setPinHash(null);
        setHasPin(false);
        setIsLocked(true);
    }, []);

    // Expose async unlock for proper handling
    const contextValue: AuthContextType = {
        isLocked,
        hasPin,
        unlock: (pin: string) => {
            hashPin(pin).then(hash => {
                if (hash === pinHash) {
                    setIsLocked(false);
                    localStorage.setItem(LOCK_STATE_KEY, 'unlocked');
                    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
                }
            });
            return true;
        },
        lock,
        setPin,
        clearPin
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Export hash function for PIN verification in component
export { hashPin };
