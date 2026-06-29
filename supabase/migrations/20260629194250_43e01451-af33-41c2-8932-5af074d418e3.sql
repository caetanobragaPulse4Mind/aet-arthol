
-- =========================================================================
-- aet-rpa schema
-- =========================================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nome        text        NOT NULL,
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'operador' CHECK (role IN ('admin', 'operador')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- helper: is admin?
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'admin');
$$;

-- 2. TRECHOS
CREATE TABLE IF NOT EXISTS public.trechos (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  linha       int,
  br          int          NOT NULL,
  estado      char(2)      NOT NULL,
  km_ini      numeric(8,2) NOT NULL,
  km_fim      numeric(8,2) NOT NULL,
  ativo       boolean      NOT NULL DEFAULT true,
  fonte       text         NOT NULL DEFAULT 'planilha' CHECK (fonte IN ('planilha', 'manual')),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (br, estado, km_ini, km_fim)
);
CREATE INDEX IF NOT EXISTS trechos_br_estado_idx ON public.trechos(br, estado);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trechos TO authenticated;
GRANT ALL ON public.trechos TO service_role;

-- 3. IMPORTACOES_TRECHOS
CREATE TABLE IF NOT EXISTS public.importacoes_trechos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo       text        NOT NULL,
  inseridos     int         NOT NULL DEFAULT 0,
  atualizados   int         NOT NULL DEFAULT 0,
  desativados   int         NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'sucesso',
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importacoes_trechos TO authenticated;
GRANT ALL ON public.importacoes_trechos TO service_role;

-- 4. VEICULOS (cavalos / caminhões)
CREATE TABLE IF NOT EXISTS public.veiculos (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  placa               text        NOT NULL UNIQUE,
  ano_fabricacao      int,
  chassi              text,
  marca               text,
  modelo              text,
  tipo_carroceria     text,
  tara                numeric(8,3),
  tracao              text,
  potencia            int,
  cmt                 numeric(8,3),
  direcao             text,
  renavam             text,
  rntrc               text,
  num_eixos           int,
  bidirecional        boolean     NOT NULL DEFAULT false,
  ativo               boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;

-- 5. REBOQUES
CREATE TABLE IF NOT EXISTS public.reboques (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  placa               text        NOT NULL UNIQUE,
  ano_fabricacao      int,
  chassi              text,
  marca               text,
  modelo              text,
  tipo_carroceria     text,
  tara                numeric(8,3),
  renavam             text,
  rntrc               text,
  num_eixos           int,
  tipo_engate         text,
  tipo_eixos          text,
  ativo               boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reboques TO authenticated;
GRANT ALL ON public.reboques TO service_role;

-- 6. COMPOSICOES
CREATE TABLE IF NOT EXISTS public.composicoes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id          uuid        NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  reboque_id          uuid        NOT NULL REFERENCES public.reboques(id) ON DELETE RESTRICT,
  eixos_cavalo        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  eixos_reboque       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  dist_b              numeric(8,2),
  dist_c              numeric(8,2),
  dist_d              numeric(8,2),
  comprimento_total   numeric(8,2),
  largura_veiculo     numeric(8,2),
  excesso_esquerdo    numeric(8,2),
  excesso_direito     numeric(8,2),
  largura_total       numeric(8,2),
  altura_total        numeric(8,2),
  ativo               boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.composicoes TO authenticated;
GRANT ALL ON public.composicoes TO service_role;

-- 7. AETS
CREATE TABLE IF NOT EXISTS public.aets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_aet      text        UNIQUE,
  resolucao       text,
  composicao_id   uuid        REFERENCES public.composicoes(id) ON DELETE SET NULL,
  origem_carga    text,
  destino_carga   text,
  situacao        text        NOT NULL DEFAULT 'EM SOLICITAÇÃO'
                    CHECK (situacao IN ('LIBERADA','EM SOLICITAÇÃO','EM PROCESSO DE ANÁLISE','CANCELADA','VENCIDA')),
  portal_origem   text        NOT NULL DEFAULT 'SIAET',
  pdf_url         text,
  data_inicio     date,
  data_fim        date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aets_situacao_idx ON public.aets(situacao);
CREATE INDEX IF NOT EXISTS aets_data_fim_idx ON public.aets(data_fim);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aets TO authenticated;
GRANT ALL ON public.aets TO service_role;

-- 8. BOLETOS
CREATE TABLE IF NOT EXISTS public.boletos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aet_id            uuid        NOT NULL REFERENCES public.aets(id) ON DELETE CASCADE,
  url               text,
  valor             numeric(12,2) NOT NULL DEFAULT 0,
  data_vencimento   date,
  status            text        NOT NULL DEFAULT 'PENDENTE'
                      CHECK (status IN ('PENDENTE','PAGO','VENCIDO')),
  data_pagamento    date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS boletos_aet_idx ON public.boletos(aet_id);
CREATE INDEX IF NOT EXISTS boletos_status_idx ON public.boletos(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletos TO authenticated;
GRANT ALL ON public.boletos TO service_role;

-- 9. AET_PERCURSO
CREATE TABLE IF NOT EXISTS public.aet_percurso (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aet_id        uuid        NOT NULL REFERENCES public.aets(id) ON DELETE CASCADE,
  ordem         int         NOT NULL DEFAULT 1,
  br            int,
  estado        char(2),
  km_ini        numeric(8,2),
  km_fim        numeric(8,2),
  local_inicio  text,
  local_fim     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aet_percurso_aet_idx ON public.aet_percurso(aet_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aet_percurso TO authenticated;
GRANT ALL ON public.aet_percurso TO service_role;

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trechos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes_trechos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reboques            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composicoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aet_percurso        ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public' AND tablename IN
    ('profiles','trechos','importacoes_trechos','veiculos','reboques','composicoes','aets','boletos','aet_percurso')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename); END LOOP;
END $$;

CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_all"   ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "trechos_select_auth" ON public.trechos FOR SELECT TO authenticated USING (true);
CREATE POLICY "trechos_admin_write" ON public.trechos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "imp_select_auth" ON public.importacoes_trechos FOR SELECT TO authenticated USING (true);
CREATE POLICY "imp_admin_write" ON public.importacoes_trechos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "veiculos_all"     ON public.veiculos     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reboques_all"     ON public.reboques     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "composicoes_all"  ON public.composicoes  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "aets_all"         ON public.aets         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "boletos_all"      ON public.boletos      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "aet_percurso_all" ON public.aet_percurso FOR ALL TO authenticated USING (true) WITH CHECK (true);
