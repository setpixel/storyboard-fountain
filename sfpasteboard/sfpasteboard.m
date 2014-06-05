/**
 * StoryboardFountain pasteboard copy/paste helper app
 * Based on code found here: http://www.alecjacobson.com/weblog/?p=3816
 * Build with: gcc -Wall -g -O3 -ObjC -framework Foundation -framework AppKit -o sfpasteboard sfpasteboard.m
 */

#import <Foundation/Foundation.h>
#import <Cocoa/Cocoa.h>
#import <unistd.h>

/**
 * Copy an image and custom id to the pasteboard.
 * Image is streamed from stdin, id is passed in arguments
 */
BOOL copy_to_clipboard(NSString *id)
{
  // http://stackoverflow.com/questions/2681630/how-to-read-png-image-to-nsimage
  // http://caiustheory.com/read-standard-input-using-objective-c 
  NSFileHandle *input = [NSFileHandle fileHandleWithStandardInput];
  NSImage * image = [[NSImage alloc] initWithData:[input readDataToEndOfFile]];

  // http://stackoverflow.com/a/18124824/148668
  BOOL copied = false;
  if (image != nil)
  {
    NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
    [pasteboard clearContents];
    [pasteboard declareTypes:[NSArray arrayWithObjects:NSTIFFPboardType, @"com.storyboardfountain.app.board", nil] owner:nil];
    copied = [pasteboard setData:[image TIFFRepresentation] forType:NSTIFFPboardType];
    copied = copied & [pasteboard setString:id forType:@"com.storyboardfountain.app.board"];
    [pasteboard release];
  }
  [image release];
  return copied;
}

/**
 * Get an image and custom id from the pasteboard.
 * Id is streamed out over stdout.
 */
BOOL paste_from_clipboard()
{
  NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
  /*
  Wanted to stream out the image, but this is not working correctly (seemingly on the other side)

  NSArray *classArray = [NSArray arrayWithObject:[NSImage class]];
  NSArray *list = [pasteboard readObjectsForClasses:classArray options:[NSDictionary dictionary]];
  NSImage *image = nil;
  if (list && [list count] > 0) {
    image = [list objectAtIndex:0];
  }
  else {
    NSLog(@"boo");
    return NO;
  }
  */

  NSString *id = [pasteboard stringForType:@"com.storyboardfountain.app.board"];
  if (!id) {
    id = @"NOID";
  }

  /*
  [image lockFocus];
  NSBitmapImageRep *bitmapRep = [[NSBitmapImageRep alloc] initWithFocusedViewRect:NSMakeRect(0, 0, image.size.width, image.size.height)];
  [image unlockFocus];
  NSData *imageData = [bitmapRep representationUsingType:NSPNGFileType properties:nil];
  */

  NSFileHandle *stdout = [NSFileHandle fileHandleWithStandardOutput];
  NSData* idData=[id dataUsingEncoding:NSUTF8StringEncoding];
  NSUInteger idLength = idData.length;

  [stdout retain];
  [stdout writeData:[NSData dataWithBytesNoCopy:&idLength length:sizeof(idLength) freeWhenDone:NO]];
  [stdout writeData:[NSData dataWithBytes:[idData bytes] length:idLength]];
  //[stdout writeData:[NSData dataWithBytes:[imageData bytes] length:[imageData length]]];
  [stdout release];

  return YES;
}

int main(int argc, char * const argv[])
{
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  BOOL success = NO;
  if(argc == 1)
  {
    success = paste_from_clipboard();
  }
  else {
    NSString *id= [NSString stringWithUTF8String:argv[1]];
    success = copy_to_clipboard(id);
  }
  [pool release];
  return (success?EXIT_SUCCESS:EXIT_FAILURE);
}
