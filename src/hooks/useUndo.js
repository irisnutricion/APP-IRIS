import { useState, useCallback } from 'react';

export default function useUndo(initialState, maxHistory = 50) {
    const [state, setState] = useState(initialState);
    const [history, setHistory] = useState([initialState]);
    const [index, setIndex] = useState(0);

    const setUndoableState = useCallback((newStateOrUpdater) => {
        setState((prevState) => {
            const nextState = typeof newStateOrUpdater === 'function' ? newStateOrUpdater(prevState) : newStateOrUpdater;

            // Only push to history if the state has actually changed reference/value (basic check)
            // Or just push blindly, but it's better to avoid empty states
            setHistory((prevHistory) => {
                const newHistory = prevHistory.slice(0, index + 1);
                newHistory.push(nextState);
                if (newHistory.length > maxHistory) {
                    newHistory.shift(); // remove oldest if exceeded
                }
                setIndex(newHistory.length - 1);
                return newHistory;
            });

            return nextState;
        });
    }, [index, maxHistory]);

    const undo = useCallback(() => {
        if (index > 0) {
            const newIndex = index - 1;
            setIndex(newIndex);
            setState(history[newIndex]);
        }
    }, [history, index]);

    const redo = useCallback(() => {
        if (index < history.length - 1) {
            const newIndex = index + 1;
            setIndex(newIndex);
            setState(history[newIndex]);
        }
    }, [history, index]);

    const canUndo = index > 0;
    const canRedo = index < history.length - 1;

    // A helper to let us set state directly without history (e.g., initial mounting or resets)
    const resetHistory = useCallback((newState) => {
        setState(newState);
        setHistory([newState]);
        setIndex(0);
    }, []);

    return [state, setUndoableState, undo, redo, canUndo, canRedo, resetHistory];
}
