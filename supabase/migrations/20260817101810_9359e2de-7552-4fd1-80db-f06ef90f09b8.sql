
DO $$
DECLARE
  keeper RECORD;
  dupe RECORD;
  keeper_cur uuid;
  dupe_subj RECORD;
  target_subj uuid;
BEGIN
  FOR keeper IN
    SELECT DISTINCT ON (lower(name)) id, name FROM classes ORDER BY lower(name), created_at
  LOOP
    SELECT id INTO keeper_cur FROM curricula WHERE class_id = keeper.id ORDER BY created_at LIMIT 1;

    FOR dupe IN SELECT id FROM classes WHERE lower(name) = lower(keeper.name) AND id <> keeper.id LOOP
      -- pindahkan mapel duplikat
      FOR dupe_subj IN
        SELECT s.id, s.name FROM subjects s
        JOIN curricula cu ON cu.id = s.curriculum_id
        WHERE cu.class_id = dupe.id
      LOOP
        SELECT s2.id INTO target_subj
        FROM subjects s2 JOIN curricula cu2 ON cu2.id = s2.curriculum_id
        WHERE cu2.class_id = keeper.id AND lower(s2.name) = lower(dupe_subj.name)
        LIMIT 1;

        IF target_subj IS NULL THEN
          UPDATE subjects SET curriculum_id = keeper_cur WHERE id = dupe_subj.id;
        ELSE
          UPDATE meetings SET subject_id = target_subj WHERE subject_id = dupe_subj.id;
          UPDATE exams SET subject_id = target_subj WHERE subject_id = dupe_subj.id;
          UPDATE question_bank SET subject_id = target_subj WHERE subject_id = dupe_subj.id;
          UPDATE class_students SET subject_id = target_subj WHERE subject_id = dupe_subj.id;
          DELETE FROM subjects WHERE id = dupe_subj.id;
        END IF;
        target_subj := NULL;
      END LOOP;

      UPDATE meetings SET class_id = keeper.id WHERE class_id = dupe.id;
      UPDATE exams SET class_id = keeper.id WHERE class_id = dupe.id;
      UPDATE question_bank SET class_id = keeper.id WHERE class_id = dupe.id;

      DELETE FROM class_students cs
      WHERE cs.class_id = dupe.id
        AND EXISTS (SELECT 1 FROM class_students k WHERE k.class_id = keeper.id AND k.student_id = cs.student_id);
      UPDATE class_students SET class_id = keeper.id WHERE class_id = dupe.id;

      DELETE FROM curricula WHERE class_id = dupe.id;
      DELETE FROM classes WHERE id = dupe.id;
    END LOOP;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS classes_name_unique_idx ON public.classes (lower(name));
