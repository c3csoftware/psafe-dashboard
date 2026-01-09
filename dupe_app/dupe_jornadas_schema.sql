DROP TABLE IF EXISTS dupe_jornada_eventos;
DROP TABLE IF EXISTS dupe_jornadas;

CREATE TABLE dupe_jornadas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    show_funil BOOLEAN DEFAULT TRUE,
    show_skus BOOLEAN DEFAULT FALSE,
    show_telas BOOLEAN DEFAULT FALSE,
    show_correlacoes BOOLEAN DEFAULT TRUE,
    show_event_periodic_funnel BOOLEAN DEFAULT FALSE,
    show_user_periodic_funnel BOOLEAN DEFAULT FALSE
);

CREATE TABLE dupe_jornada_eventos (
    jornada_id TEXT REFERENCES dupe_jornadas(id) ON DELETE CASCADE,
    evento_valor TEXT NOT NULL,
    rotulo TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    PRIMARY KEY (jornada_id, ordem)
);

-- Inserindo dados do arquivo jornadas.json

-- Jornada Monetização
INSERT INTO dupe_jornadas (id, nome, show_funil, show_skus, show_telas, show_correlacoes, show_event_periodic_funnel, show_user_periodic_funnel)
VALUES ('jornada_monetizacao', 'Jornada: Monetização', true, true, true, true, false, false);

INSERT INTO dupe_jornada_eventos (jornada_id, evento_valor, rotulo, ordem) VALUES
('jornada_monetizacao', 'event_14000', 'Assinatura tela aberta', 1),
('jornada_monetizacao', 'event_14001', 'Assinatura iniciada', 2),
('jornada_monetizacao', 'event_14003', 'Assinatura concluída', 3);

-- Jornada Aquisição
INSERT INTO dupe_jornadas (id, nome, show_funil, show_skus, show_telas, show_correlacoes, show_event_periodic_funnel, show_user_periodic_funnel)
VALUES ('jornada_aquisicao', 'Jornada: Aquisição', true, false, false, true, true, true);

INSERT INTO dupe_jornada_eventos (jornada_id, evento_valor, rotulo, ordem) VALUES
('jornada_aquisicao', 'first_open', 'Primeira abertura', 1),
('jornada_aquisicao', 'event_8000', 'Aplicativo instalado', 2);