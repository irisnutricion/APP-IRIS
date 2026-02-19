import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [nutritionistId, setNutritionistId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchRole(session.user.id);
            } else {
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchRole(session.user.id);
            } else {
                setRole(null);
                setLoading(false);
            }
        });

        // Safety timeout: stop loading after 5 seconds no matter what
        const timer = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn("Auth loading timed out, forcing render.");
                    return false;
                }
                return prev;
            });
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const fetchRole = async (userId) => {
        try {
            // Fetch Role from Profiles
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Error fetching role:', profileError);
                setRole('nutritionist'); // Fallback
            } else {
                setRole(profileData?.role ?? 'nutritionist');
            }

            // Fetch Nutritionist ID linked to this user
            const { data: nutriData, error: nutriError } = await supabase
                .from('nutritionists')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            if (!nutriError && nutriData) {
                setNutritionistId(nutriData.id);
            } else {
                setNutritionistId(null);
            }

        } catch (error) {
            console.error('Error fetching user details:', error);
            setRole('nutritionist');
            setNutritionistId(null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchRole(user.id);
        }
    };

    const value = {
        user,
        role,
        nutritionistId,
        isAdmin: role === 'admin',
        loading,
        signOut,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
