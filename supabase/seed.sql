insert into jobs (
  external_id,
  slug,
  title,
  company,
  company_logo,
  location,
  domain,
  description,
  salary_min,
  salary_max,
  level,
  easy_apply,
  skills
)
values
  ('ai-001', 'ai-ml-engineer-rag', 'AI/ML Engineer - RAG Systems', 'NovaPilot AI', 'NP', 'Remote', 'AI / ML', 'Build production RAG systems, agent workflows, and FastAPI services.', 1800000, 2800000, 'mid', true, '{"python","rag","langchain","fastapi","vector databases","docker"}'),
  ('be-001', 'backend-engineer-fastapi', 'Backend Engineer - FastAPI', 'APICraft', 'AC', 'Remote', 'Software Engineering', 'Design scalable backend APIs, auth flows, and async workers.', 1400000, 2300000, 'mid', true, '{"python","fastapi","postgresql","docker","redis","jwt"}'),
  ('ph-001', 'qc-analyst-stability', 'QC Analyst - Stability', 'Zenova Pharma', 'ZP', 'Ahmedabad', 'Pharmaceuticals', 'Handle stability testing, sample analysis, and cGMP quality control workflows.', 450000, 750000, 'mid', true, '{"quality control","stability","hplc","documentation","gmp","pharmaceutical analysis"}');
