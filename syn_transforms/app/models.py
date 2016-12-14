"""

Here the models for our database is defined.

I am using Postgres, Flask-SQLAlchemy for this application.

For an introduction to Flask-SQLAlchemy check out: http://flask-sqlalchemy.pocoo.org/2.1/
""" 
from app import db

class SINData(db.Model):
    """
    This model gives us a description of calc data.
    
    parameters:
    @sin
    @contract_number
    @vendor
    """
    __tablename__ = 'sin_data'
    id = db.Column(db.Integer, primary_key=True)
    sin = db.Column(db.String)
    contract_number = db.Column(db.String)
    vendor = db.Column(db.String)
    
    def __init__(self,sin,contract_number,vendor):
        self.sin = sin
        self.contract_number = contract_number
        self.vendor = vendor
