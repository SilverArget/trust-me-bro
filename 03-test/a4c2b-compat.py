from pathlib import Path
p=Path('js/a12-campaign.js');s=p.read_bytes().decode();old='''      if (!campaignChief.active && player.x>=(route.chief?.startX ?? 1800)) {
        campaignChief.active=true;
        campaignChief.x=player.x-380;
        emitGame("chief_chase_started",{routeId});
      }''';new='''      if (!campaignChief.active && player.x>=1800) {
        if (!route.chief || player.x>=route.chief.startX) {
        campaignChief.active=true;
        campaignChief.x=player.x-380;
        emitGame("chief_chase_started",{routeId});
        }
      }''';assert old in s;s=s.replace(old,new);p.write_bytes(s.encode())
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();s=s.replace('registry A4c-2a two implemented routes','registry A4c-2b four implemented routes').replace('routes: \\["A01", "A02"\\]','routes: \\["A01", "A02", "A03", "A04"\\]');s=s.replace('const h=hazards.find(o=>o.type==="collapse");zone.x=h.x','const h=hazards.find(o=>o.type==="containerDoor");zone.x=h.x');p.write_bytes(s.encode())
