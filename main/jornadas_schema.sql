DROP TABLE IF EXISTS jornada_eventos CASCADE;
DROP TABLE IF EXISTS jornada CASCADE;

CREATE TABLE jornada (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    show_funil BOOLEAN,
    show_skus BOOLEAN,
    show_telas BOOLEAN,
    show_correlacoes BOOLEAN,
    show_event_periodic_funnel BOOLEAN,
    show_user_periodic_funnel BOOLEAN
);

CREATE TABLE jornada_eventos (
    jornada_id TEXT REFERENCES jornada(id),
    evento_valor TEXT REFERENCES evento(valor),
    ordem INTEGER,
    PRIMARY KEY (jornada_id, evento_valor)
);

-- Inserir dados na tabela 'jornadas'
INSERT INTO jornada (id, nome, show_funil, show_skus, show_telas, show_correlacoes, show_event_periodic_funnel, show_user_periodic_funnel) VALUES
('jornada_monetizacao', 'Jornada: Monetização', true, true, true, true, false, false),
('jornada_aquisicao', 'Jornada: Aquisição', true, false, false, true, true, true);

-- Inserir dados na tabela 'jornada_eventos'
-- Jornada: Monetização
INSERT INTO jornada_eventos (jornada_id, evento_valor, ordem) VALUES
('jornada_monetizacao', 'event_14000', 0),
('jornada_monetizacao', 'event_14001', 1),
('jornada_monetizacao', 'event_14003', 2);

-- Jornada: Aquisição
INSERT INTO jornada_eventos (jornada_id, evento_valor, ordem) VALUES
('jornada_aquisicao', 'first_open', 0),
('jornada_aquisicao', 'event_8000', 1);
