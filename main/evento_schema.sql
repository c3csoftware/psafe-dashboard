DROP TABLE IF EXISTS evento CASCADE;

CREATE TABLE evento (
    valor TEXT PRIMARY KEY,
    rotulo TEXT NOT NULL
);

INSERT INTO evento (valor, rotulo) VALUES
('event_8000', 'Aplicativo instalado'),
('first_open', 'Primeira abertura'),
('event_14000', 'Assinatura tela aberta'),
('event_14001', 'Assinatura iniciada'),
('event_14003', 'Assinatura concluída'),
('event_10100', 'Install Monitor'),
('event_1600', 'Quick Clean Up'),
('event_9900', 'Antiphishing'),
('event_2100', 'Quick Av Scan'),
('event_2300', 'Full Av Scan'),
('event_1750', 'Storege Clean Up'),
('event_1650', 'Duplicate Photos'),
('event_31009', 'Daily Phone Checkup'),
('event_29000', 'Download Cleaner'),
('event_1700', 'Manage Apps'),
('event_10210', 'Clean Whatsapp Image'),
('event_37000', 'Duplicate Videos'),
('event_2600', 'Wifi Check'),
('event_10000', 'Flashlight'),
('event_26003', 'Privicy Protection'),
('event_30000', 'Gallery Assistant'),
('event_10850', 'Security Manager'),
('event_39100', 'URL Checker'),
('event_39000', 'Whatsapp Cloning'),
('event_10800', 'Clean Facebook'),
('event_10208', 'Clean Whatsapp Audio'),
('event_4418', 'Settings Mendals Screen'),
('event_10209', 'Clean Whatsapp Video'),
('event_3600', 'Hidden Gallery');