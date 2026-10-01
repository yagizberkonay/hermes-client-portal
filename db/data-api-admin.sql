-- Authenticated bootstrap and admin-only management policies.
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON clients, projects, project_members, milestones, payments, invoices, files, activities, messages TO authenticated;
GRANT SELECT ON project_financials TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_self_insert' AND tablename = 'users') THEN
    CREATE POLICY users_self_insert ON users FOR INSERT TO authenticated WITH CHECK ((select auth.user_id()) = auth0_sub);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_self_update' AND tablename = 'users') THEN
    CREATE POLICY users_self_update ON users FOR UPDATE TO authenticated USING ((select auth.user_id()) = auth0_sub) WITH CHECK ((select auth.user_id()) = auth0_sub);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admins_users_all' AND tablename = 'users') THEN
    CREATE POLICY admins_users_all ON users FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users admin WHERE admin.auth0_sub = (select auth.user_id()) AND admin.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM users admin WHERE admin.auth0_sub = (select auth.user_id()) AND admin.role = 'admin'));
  END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','projects','project_members','milestones','payments','invoices','files','activities','messages'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admins_' || t || '_all' AND tablename = t) THEN
      EXECUTE format('CREATE POLICY admins_%s_all ON %I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users admin WHERE admin.auth0_sub = (select auth.user_id()) AND admin.role = ''admin'')) WITH CHECK (EXISTS (SELECT 1 FROM users admin WHERE admin.auth0_sub = (select auth.user_id()) AND admin.role = ''admin''))', t, t);
    END IF;
  END LOOP;
END $$;
