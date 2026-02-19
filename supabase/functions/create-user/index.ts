import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create admin client using service role key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Verify the calling user is admin
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('No authorization header');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user: callingUser } } = await supabaseClient.auth.getUser();
        if (!callingUser) throw new Error('Unauthorized');

        // Check calling user is admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', callingUser.id)
            .single();

        if (profile?.role !== 'admin') throw new Error('Only admins can create users');

        // Parse request
        const { email, password, full_name, nutritionist_id } = await req.json();
        if (!email || !password) throw new Error('Email and password are required');

        // Create auth user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            user_metadata: { full_name: full_name || email },
            email_confirm: true, // auto-confirm so they can log in immediately
        });

        if (createError) throw createError;

        // Profile is auto-created by trigger, but ensure role is 'nutritionist'
        await supabaseAdmin
            .from('profiles')
            .upsert({ id: newUser.user!.id, email, full_name: full_name || email, role: 'nutritionist' });

        // If nutritionist_id provided, link them
        if (nutritionist_id) {
            const { error: linkError } = await supabaseAdmin
                .from('nutritionists')
                .update({ user_id: newUser.user!.id })
                .eq('id', nutritionist_id);

            if (linkError) throw linkError;
        }

        return new Response(
            JSON.stringify({ success: true, user_id: newUser.user!.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
