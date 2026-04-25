# Remove embedding field from Reference model
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('literature', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='reference',
            name='embedding',
        ),
    ]
