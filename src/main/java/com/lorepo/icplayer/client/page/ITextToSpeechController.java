package com.lorepo.icplayer.client.page;

import java.util.List;

import com.lorepo.icf.utils.NavigationModuleIndentifier;


public interface ITextToSpeechController {
	public void playTitle (String area, String id, String lagTag);
	public void playDescription (String id, String langTag);
	public void speak (String text, String langTag);
	public void readGap (String text, String currentGapContent, int gapNumber);
	public void readStartText();
	public void readExitText();
	public List<NavigationModuleIndentifier> getModulesOrder ();
	public List<String> getMultiPartDescription (String id);
	public boolean isTextToSpeechModuleEnable ();
}
