/*
# ReserveIt Seed Data Migration

1. Seed Data
- Facilities for FO, RO, and AERO departments
- System settings
- Sample data for testing
*/

-- Insert Facilities (FO Department)
INSERT INTO facilities (name, department, type, capacity, location, description, amenities, requires_approval, min_notice_hours) VALUES
('18F Roofdeck', 'FO', 'outdoor', 200, '18th Floor', 'Open-air rooftop venue with panoramic views', ARRAY['projector', 'sound_system', 'chairs', 'tables'], true, 72),
('17F MPR', 'FO', 'indoor', 150, '17th Floor', 'Multi-purpose room for meetings and events', ARRAY['projector', 'microphone', 'whiteboard'], true, 48),
('17F Gym', 'FO', 'sports', 100, '17th Floor', 'Indoor gymnasium for sports activities', ARRAY['basketball_court', 'volleyball_net', 'bleachers'], true, 72),
('8F Executive Lounge 1', 'FO', 'indoor', 30, '8th Floor', 'Executive meeting lounge', ARRAY['tv', 'sofa', 'coffee_machine'], true, 48),
('8F Executive Lounge 2', 'FO', 'indoor', 30, '8th Floor', 'Executive meeting lounge', ARRAY['tv', 'sofa', 'coffee_machine'], true, 48),
('8F Executive Lounge 3', 'FO', 'indoor', 30, '8th Floor', 'Executive meeting lounge', ARRAY['tv', 'sofa', 'coffee_machine'], true, 48),
('2F Student Plaza', 'FO', 'outdoor', 500, '2nd Floor', 'Large open plaza for student gatherings', ARRAY['stage', 'led_wall', 'sound_system'], true, 72),
('3F Swimming Pool', 'FO', 'sports', 80, '3rd Floor', 'Olympic-size swimming pool', ARRAY['lockers', 'showers', 'bleachers'], true, 168),
('Study Area', 'FO', 'study', 50, 'Various', 'Quiet study spaces', ARRAY['wifi', 'power_outlets'], false, 24),
('Conference Room A', 'FO', 'indoor', 20, 'Various', 'Small conference room', ARRAY['projector', 'whiteboard'], true, 48),
('Conference Room B', 'FO', 'indoor', 20, 'Various', 'Small conference room', ARRAY['projector', 'whiteboard'], true, 48)
ON CONFLICT DO NOTHING;

-- Insert Facilities (RO Department)
INSERT INTO facilities (name, department, type, capacity, location, description, amenities, requires_approval, min_notice_hours) VALUES
('Case Room 1604', 'RO', 'indoor', 40, '16th Floor', 'Case study discussion room', ARRAY['projector', 'whiteboard', 'round_tables'], true, 48),
('AVR 1603', 'RO', 'indoor', 60, '16th Floor', 'Audio-visual room for presentations', ARRAY['projector', 'speakers', 'microphone'], true, 48),
('Classroom A', 'RO', 'indoor', 50, 'Various', 'Standard classroom', ARRAY['projector', 'whiteboard'], true, 24),
('Classroom B', 'RO', 'indoor', 50, 'Various', 'Standard classroom', ARRAY['projector', 'whiteboard'], true, 24)
ON CONFLICT DO NOTHING;

-- Insert Facilities (AERO Department)
INSERT INTO facilities (name, department, type, capacity, location, description, amenities, requires_approval, min_notice_hours) VALUES
('MPR 1502', 'AERO', 'indoor', 80, '15th Floor', 'Multi-purpose room', ARRAY['projector', 'sound_system', 'chairs'], true, 48),
('MPR 1503', 'AERO', 'indoor', 80, '15th Floor', 'Multi-purpose room', ARRAY['projector', 'sound_system', 'chairs'], true, 48),
('MPR 1504', 'AERO', 'indoor', 80, '15th Floor', 'Multi-purpose room', ARRAY['projector', 'sound_system', 'chairs'], true, 48)
ON CONFLICT DO NOTHING;

-- Insert System Settings
INSERT INTO system_settings (key, value, description) VALUES
('maintenance_mode', '{"enabled": false, "message": "System under maintenance"}', 'System maintenance mode'),
('max_reservation_days', '{"value": 30}', 'Maximum days in advance for reservations'),
('default_approval_workflow', '{"steps": ["department_head", "facilities_office", "admin"]}', 'Default approval workflow steps'),
('notification_settings', '{"email": true, "push": true, "sms": false}', 'Default notification preferences')
ON CONFLICT DO NOTHING;
