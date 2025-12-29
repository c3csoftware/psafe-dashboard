-- This schema is designed to replace the file-based data storage 
-- (CSV and JSON files) for the dashboard application.

-- -----------------------------------------------------------------------------
-- Table for storing the main event data, replacing `historico_eventos.csv`
-- -----------------------------------------------------------------------------
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_count INTEGER NOT NULL,
    user_count INTEGER NOT NULL
);

-- Indexes to speed up queries that filter by date and event name
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_event_name ON events(event_name);

-- -----------------------------------------------------------------------------
-- Table for storing event-related details like SKUs and Screens (Telas).
-- This single table replaces the need for multiple files like 
-- `historico_skus_*.csv` and `historico_telas_*.csv`.
-- -----------------------------------------------------------------------------
CREATE TABLE event_details (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    -- The name of the event that these details are associated with.
    event_name VARCHAR(255) NOT NULL,
    -- The type of detail, e.g., 'SKU' or 'TELA'.
    detail_type VARCHAR(50) NOT NULL,
    -- The actual value, e.g., 'sku_premium_yearly' or 'onboarding_screen'.
    detail_value VARCHAR(255) NOT NULL,
    detail_count INTEGER NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_event_details_event_date ON event_details(event_date);
CREATE INDEX idx_event_details_event_name ON event_details(event_name);
CREATE INDEX idx_event_details_detail_type ON event_details(detail_type);


-- -----------------------------------------------------------------------------
-- Table for storing journey configurations, replacing `jornadas.json`.
-- Storing this in the database allows for dynamic updates without redeployment.
-- -----------------------------------------------------------------------------
CREATE TABLE journeys (
    id SERIAL PRIMARY KEY,
    -- This should correspond to the 'id' field in the original JSON file.
    journey_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    -- Storing the rest of the journey configuration as a JSONB object
    -- provides flexibility if the structure changes over time.
    config JSONB NOT NULL
);

-- -----------------------------------------------------------------------------
-- Table for storing the list of selectable events, replacing 
-- `eventos_selecionados.json`.
-- -----------------------------------------------------------------------------
CREATE TABLE selected_events (
    id SERIAL PRIMARY KEY,
    -- The 'valor' from the JSON file
    event_value VARCHAR(255) UNIQUE NOT NULL,
    -- The 'rotulo' from the JSON file
    event_label VARCHAR(255) NOT NULL
);

-- You can insert the default selected events like this:
-- INSERT INTO selected_events (event_value, event_label) VALUES ('event_name_1', 'Event Label 1');
-- INSERT INTO selected_events (event_value, event_label) VALUES ('event_name_2', 'Event Label 2');
