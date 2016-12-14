#Setup

1. `createuser -P -s -e -d sin_user`

2. `createdb calc_data`

3. from `calc-analysis/syn_transforms/` run `python`, then type in 

```
from app import db
db.create_all()
```

4. update `calc-analysis/syn_transforms/app/models.py` - with the model you want.

