-- FLPT achievement catalog v2 (funny + trackable). Idempotent by code.
-- Run in Supabase SQL editor if migrations are not auto-applied.

INSERT INTO public.achievements (code, title, description, icon, threshold) VALUES
-- Getting started
('first_step', 'First Step', 'You clicked an answer. History has been made.', 'seedling', 1),
('warm_up_act', 'Warm-Up Act', 'Okay, you''re technically studying now.', 'pencil', 10),
('brain_booting', 'Brain Booting…', 'Please wait. Intelligence is loading.', 'brain', 50),
('getting_serious', 'Getting Serious', 'This was supposed to be a quick review, wasn''t it?', 'books', 100),

-- Accuracy / scores
('clean_sweep', 'Clean Sweep', 'Absolutely nothing went wrong. Beautiful.', 'broom', 100),
('academic_damage', 'Academic Damage', 'The questions tried. They failed.', 'skull', 90),
('deadeye', 'Deadeye', 'Not a single miss. Suspicious.', 'target', 10),
('on_fire', 'On Fire', 'Someone stop them. Actually, don''t.', 'fire', 20),

-- Grinding
('brick_by_brick', 'Brick by Brick', 'One question at a time. Unfortunately.', 'brick', 500),
('built_different', 'Built Different', 'At this point, you''re basically living here.', 'building', 1000),
('question_hoarder', 'Question Hoarder', 'You don''t need all of those. But sure.', 'bookmark', 25),
('science_survivor', 'Science Survivor', 'Science has been survived.', 'flask', 50),
('math_survivor', 'Math Survivor', 'Numbers have failed to defeat you.', 'divide', 50),
('word_warrior', 'Word Warrior', 'Words fear you now.', 'book', 50),
('kasaysayan_survivor', 'Kasaysayan Survivor', 'You have argued with Philippine history and survived.', 'flag', 50),
('teacher_mode', 'Teacher Mode', 'You are slowly becoming the teacher.', 'chalkboard', 100),

-- Streaks
('still_studying', 'Still Studying', 'You''re still here. Respect.', 'zombie', 3),
('no_days_off', 'No Days Off', 'Seven days. Who gave you this much discipline?', 'fire', 7),
('im_still_here', 'I''m Still Here', 'At this point, FLPT is part of your life.', 'calendar', 30),
('streak_goblin_14', 'Streak Goblin III', 'Fourteen days. The faculty room notices.', 'coffee', 14),
('streak_goblin_100', 'Streak Goblin V', 'One hundred days. Touch grass… after the board exam.', 'crown', 100),

-- Sessions / time
('night_owl', 'Night Owl', 'Sleep is apparently optional.', 'moon', NULL),
('early_bird', 'Early Bird', 'Studying before everyone else wakes up. Terrifying.', 'sun', NULL),
('one_more_question', 'One More Question', 'Just one more question. Fifty questions later…', 'books', 50),
('speed_demon', 'Speed Demon', 'Fast, accurate, and mildly concerning.', 'zap', NULL),
('trust_the_process', 'Trust the Process', 'No quitting. No escaping. Just questions.', 'meditation', 20),

-- Learning / review
('mistake_detective', 'Mistake Detective', 'You found the evidence. The culprit was you.', 'search', 20),
('wait_i_know_this', 'Wait… I Actually Know This', 'Character development detected.', 'brain', 1),
('clean_your_mess', 'Clean Your Mess', 'Look at you fixing your academic crimes.', 'broom', 20),

-- LET personality
('future_teacher_loading', 'Future Teacher Loading', 'Installation progress: somewhere between coffee and panic.', 'graduation', 200),
('gened_warrior', 'General Education Warrior', 'GenEd did not go quietly.', 'shield', 50),
('profed_survivor', 'Professional Education Survivor', 'You are slowly becoming the teacher.', 'apple', 50),
('let_me_cook', 'LET Me Cook', 'For the license.', 'chef', 5),

-- Hidden / secret (codes start with secret_)
('secret_back_from_dead', 'Back From the Dead', 'FLPT remembers you. Unfortunately.', 'ghost', 30),
('secret_what_was_that', 'What Was That?', 'The questions won this round.', 'skull', 5),
('secret_barely_passed', 'Barely Passed, Still Passed', 'A win is a win. Barely.', 'run', 50)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  threshold = EXCLUDED.threshold;
