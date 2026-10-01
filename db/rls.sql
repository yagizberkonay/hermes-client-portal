-- Neon Data API security migration. Authenticated users can read only their own client graph.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_self_select' AND tablename = 'users') THEN
    CREATE POLICY users_self_select ON users FOR SELECT TO authenticated USING ((select auth.user_id()) = auth0_sub);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clients_self_select' AND tablename = 'clients') THEN
    CREATE POLICY clients_self_select ON clients FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users u WHERE u.id = clients.user_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_client_select' AND tablename = 'projects') THEN
    CREATE POLICY projects_client_select ON projects FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients c JOIN users u ON u.id = c.user_id WHERE c.id = projects.client_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'members_self_select' AND tablename = 'project_members') THEN
    CREATE POLICY members_self_select ON project_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users u WHERE u.id = project_members.user_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'milestones_client_select' AND tablename = 'milestones') THEN
    CREATE POLICY milestones_client_select ON milestones FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id WHERE p.id = milestones.project_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_client_select' AND tablename = 'payments') THEN
    CREATE POLICY payments_client_select ON payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id WHERE p.id = payments.project_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoices_client_select' AND tablename = 'invoices') THEN
    CREATE POLICY invoices_client_select ON invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id WHERE p.id = invoices.project_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'files_client_select' AND tablename = 'files') THEN
    CREATE POLICY files_client_select ON files FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id WHERE p.id = files.project_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'activities_client_select' AND tablename = 'activities') THEN
    CREATE POLICY activities_client_select ON activities FOR SELECT TO authenticated USING (activities.actor_id = (SELECT u.id FROM users u WHERE u.auth0_sub = (select auth.user_id())) OR EXISTS (SELECT 1 FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id WHERE p.id = activities.project_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_client_select' AND tablename = 'messages') THEN
    CREATE POLICY messages_client_select ON messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id WHERE p.id = messages.project_id AND u.auth0_sub = (select auth.user_id())));
  END IF;
END $$;
