import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create an admin client with the service role key to bypass RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Verify the calling user is authenticated
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('No authorization header');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user: callingUser } } = await supabaseClient.auth.getUser();
        if (!callingUser) throw new Error('Unauthorized');

        // Check if the calling user is an admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', callingUser.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Solo los administradores pueden eliminar usuarios.');
        }

        // Parse the request payload for the target user ID to delete
        const body = await req.json();
        const { targetUserId } = body;

        if (!targetUserId) {
            throw new Error('Falta el ID de usuario (targetUserId)');
        }

        // Prevent self-deletion
        if (callingUser.id === targetUserId) {
            throw new Error('No puedes eliminar tu propia cuenta mientras estás logueado.');
        }

        // 1. Check if the target user actually exists
        const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

        if (userError || !targetUser) {
            throw new Error('No se ha encontrado el usuario.');
        }

        // 2. Delete the auth user.
        // NOTE: Because of 'ON DELETE CASCADE' on profiles, and nutritionist tables, deleting the auth user
        // will automatically clean up the 'profiles' and 'nutritionists' table entries.
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (deleteError) {
            throw deleteError;
        }

        return new Response(
            JSON.stringify({ message: 'Usuario eliminado correctamente' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
