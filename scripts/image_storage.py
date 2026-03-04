"""Image Storage - Stub module for creative image management.

When Supabase Storage is configured, this module will handle uploading
creative images for backup. Currently a pass-through stub.
"""

def backup_creative_images(creatives: list) -> list:
    """Backup creative images to Supabase Storage.
    
    Currently a pass-through stub that marks all images as skipped.
    
    Args:
        creatives: List of creative dictionaries with image URLs
    
    Returns:
        The same creatives list (with backup status updated)
    """
    for creative in creatives:
        creative["image_backup_status"] = "skipped"
    return creatives
