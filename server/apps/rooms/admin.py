from django.contrib import admin

from .models import Room, RoomMember, RoomMovie, Vote


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("code", "title", "host", "status", "created_at")
    search_fields = ("code", "title")


admin.site.register(RoomMember)
admin.site.register(RoomMovie)
admin.site.register(Vote)
