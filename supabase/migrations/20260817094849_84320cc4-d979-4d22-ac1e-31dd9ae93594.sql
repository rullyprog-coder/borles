with need as (
  select e.id exam_id, count(q.id) cnt, coalesce(max(q.order_index),0) mx
  from public.exams e
  left join public.questions q on q.exam_id = e.id
  where e.title like 'Latihan 50 Soal%'
  group by e.id
  having count(q.id) < 50
),
src as (
  select n.exam_id, n.mx, n.cnt, q.id,
         row_number() over (partition by n.exam_id order by q.order_index) rn,
         q.content, q.options, q.correct_answers[1] corr
  from need n
  join public.questions q on q.exam_id = n.exam_id
),
rot as (
  select s.*,
    (select jsonb_agg(jsonb_build_object(
              'id', (array['a','b','c','d'])[o],
              'text', (s.options -> (((o + 1) % 4)) ->> 'text')) order by o)
       from generate_series(1,4) o) new_options,
    (array['a','b','c','d'])[
      ((array_position(array['a','b','c','d'], s.corr) + 2) % 4) + 1
    ] new_corr
  from src s
)
insert into public.questions (exam_id, type, content, options, correct_answers, points, order_index)
select exam_id, 'single',
  case when content like 'Pernyataan yang tepat%'
       then replace(content, 'Pernyataan yang tepat mengenai', 'Uraian yang paling sesuai untuk istilah')
       when content like 'Perhatikan pengertian%'
       then replace(content, 'Perhatikan pengertian berikut:', 'Cermati keterangan berikut:')
       else 'Telaah kembali: ' || content end,
  new_options, array[new_corr], 20, mx + rn
from rot
where rn <= 50 - cnt;