-- Add slope rating and course rating to golf_courses table
ALTER TABLE golf_courses 
ADD COLUMN slope_rating INT DEFAULT 113 COMMENT 'Slope rating (55-155, default 113)',
ADD COLUMN course_rating DECIMAL(4,1) DEFAULT 72.0 COMMENT 'Course rating (difficulty)',
ADD COLUMN tee_color ENUM('Black', 'Blue', 'White', 'Gold', 'Red') DEFAULT 'White' COMMENT 'Tee color designation';

-- Create course_holes table for detailed hole configuration
CREATE TABLE IF NOT EXISTS course_holes (
    hole_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    hole_number INT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    par INT NOT NULL CHECK (par BETWEEN 3 AND 6),
    distance_yards INT DEFAULT 0,
    distance_meters INT DEFAULT 0,
    handicap_index INT NOT NULL CHECK (handicap_index BETWEEN 1 AND 18) COMMENT 'Stroke index for handicap allocation',
    description TEXT COMMENT 'Hole description',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    UNIQUE KEY unique_hole_per_course (course_id, hole_number),
    UNIQUE KEY unique_handicap_per_course (course_id, handicap_index),
    INDEX idx_course_id (course_id),
    INDEX idx_hole_number (hole_number),
    INDEX idx_handicap_index (handicap_index)
);

-- Insert default hole configuration for existing courses
INSERT INTO course_holes (course_id, hole_number, par, distance_yards, distance_meters, handicap_index)
SELECT 
    course_id,
    1 as hole_number, 4 as par, 380 as distance_yards, 347 as distance_meters, 1 as handicap_index
FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 2, 3, 165, 151, 17 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 3, 4, 420, 384, 3 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 4, 5, 520, 475, 5 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 5, 4, 400, 366, 7 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 6, 3, 180, 165, 15 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 7, 4, 390, 357, 9 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 8, 4, 410, 375, 11 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 9, 4, 370, 338, 13 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 10, 4, 385, 352, 2 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 11, 3, 170, 155, 18 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 12, 4, 430, 393, 4 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 13, 5, 530, 485, 6 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 14, 4, 395, 361, 8 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 15, 3, 175, 160, 16 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 16, 4, 400, 366, 10 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 17, 4, 415, 379, 12 FROM golf_courses WHERE course_id = 1
UNION ALL
SELECT course_id, 18, 4, 380, 347, 14 FROM golf_courses WHERE course_id = 1;

-- Update golf_courses with sample slope and course ratings
UPDATE golf_courses 
SET 
    slope_rating = 125, 
    course_rating = 72.3,
    tee_color = 'White'
WHERE course_id = 1;

